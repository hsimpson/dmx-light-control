import { AppEventEmitter } from '@/events/app-event-emitter';
import type { DmxValue } from '@/io/dmx/types/dmx.types';
import { smoothLevel, type SpectrumFrame } from '@/io/sound-input/spectrum';
import { LoadedProject, ProjectRepository } from '@/projects/repositories/project.repository';
import {
  VIRTUAL_CONSOLE_BEAT_DEFAULT_THRESHOLD,
  type VirtualConsoleAudioBar,
  type VirtualConsoleBeatBar,
  type VirtualConsoleControl,
} from '@/projects/virtual-console';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { barLevels, nextFunctionState, thresholdDmx } from './audio-triggers';
import { BeatTempo } from './beat-tempo';
import type { VirtualConsoleFeedback, VirtualConsoleLedState } from './virtual-console-events';
import { controlToDmxValue, VirtualConsoleOutput, type VirtualConsoleBoundFixture } from './virtual-console-output';

const DMX_MAX = 255;
const MIDI_MAX = 127;
// Smoothing step when frames pause (input reopened): longer gaps would jump straight to the new level.
const MAX_SPECTRUM_GAP_MS = 200;

const PERCENT = 100;

/** In silence the last tempo is stale: show none once no beat came for this long. */
const BPM_TIMEOUT_MS = 2000;
const MS_PER_MINUTE = 60_000;

/** Live state of an enabled audio triggers control, per bar; `beat` is the pulse shown after the band bars. */
type AudioState = {
  levels: number[];
  dmx: number[];
  active: boolean[];
  beat: number;
  tempo: BeatTempo;
  gapMs?: number;
  lastBeatAt: number;
};

type StepTiming = { fadeIn: number; hold: number; fadeOut: number };

/** Plays the active project's saved virtual console: control values, DMX output and function start/stop. */
@Injectable()
export class VirtualConsolePlaybackService implements OnModuleInit {
  private projectPublicId: string | null = null;
  private controls = new Map<string, VirtualConsoleControl>();
  private fixtures: VirtualConsoleBoundFixture[] = [];
  private output = new VirtualConsoleOutput();
  private readonly values = new Map<string, number>();
  private running = new Set<string>();
  /** Which control started a running function: other starters make its LED show `monitor`. */
  private readonly startedBy = new Map<string, string>();
  /** Enabled audio triggers controls; every control starts disabled after a load. */
  private readonly audio = new Map<string, AudioState>();
  /** Last raw input per audio control, so a held key or turned knob toggles only on its rising edge. */
  private readonly audioInputs = new Map<string, number>();
  /** Bars (`controlId:index`) currently above their max per function; the first starts it, the last stops it. */
  private readonly audioHolders = new Map<string, Set<string>>();
  /** Functions an audio bar started, so audio never stops one somebody else runs. */
  private readonly audioStarted = new Set<string>();
  private lastSpectrumAt = 0;
  private lastLevels = '';

  public constructor(
    private readonly projects: ProjectRepository,
    private readonly eventEmitter: AppEventEmitter,
  ) {}

  public onModuleInit(): void {
    this.eventEmitter.on('project.virtualConsoleUpdated', async ({ projectPublicId }) => {
      await this.reload(projectPublicId);
    });
    this.eventEmitter.on('virtualConsole.input', ({ controlId, value }) => {
      this.applyInput(controlId, value);
    });
    this.eventEmitter.on('virtualConsole.midiInput', ({ entryPublicId, value }) => {
      this.applyMidiInput(entryPublicId, value);
    });
    this.eventEmitter.on('virtualConsole.inputsReleased', ({ controlIds }) => {
      this.releaseFlashButtons(controlIds);
    });
    this.eventEmitter.on('soundInput.spectrum', frame => {
      this.applySpectrum(frame);
    });
    this.eventEmitter.on('soundInput.beat', ({ level }) => {
      this.applyBeat(level);
    });
    this.eventEmitter.on('virtualConsole.state.request', () => {
      this.emitState();
    });
    this.eventEmitter.on('function.state', ({ running }) => {
      // Only a running → stopped change ends ownership: a state sent while a start is still pending
      // (starts load the function first) must not orphan it, or its starter could never stop it.
      const stopped = [...this.running].filter(functionPublicId => !running.includes(functionPublicId));
      this.running = new Set(running);
      for (const functionPublicId of stopped) {
        this.startedBy.delete(functionPublicId);
        this.audioStarted.delete(functionPublicId);
      }
      this.emitFeedback();
    });
  }

  public async reload(projectPublicId: string | null): Promise<void> {
    const project = projectPublicId ? await this.projects.findOneByPublicIdWithFixtures(projectPublicId) : undefined;
    const controls = new Map(
      (project?.virtualConsole?.pages ?? []).flatMap(page => flattenPlayable(page.controls)).map(c => [c.id, c]),
    );
    const sameProject = project?.publicId === this.projectPublicId;
    for (const [controlId, previous] of this.controls) {
      const next = sameProject ? controls.get(controlId) : undefined;
      if (!next) {
        this.release(previous);
      } else if (this.audio.has(controlId) && !sameAudioBars(previous, next)) {
        // Changed bars: stop what the old ones drive, keep the control enabled.
        this.releaseAudio(previous);
        this.audio.set(controlId, emptyAudioState());
        this.armBeat(next);
      }
    }
    this.projectPublicId = project?.publicId ?? null;
    this.controls = controls;
    this.fixtures = boundFixtures(project?.projectFixtures);
    if (!sameProject) {
      this.output = new VirtualConsoleOutput();
    }
    this.applyInitialLevels();
    this.emitState();
  }

  /** Sliders whose lowest position still outputs light (lowerLimit > 0) must write it, not leave the channel at 0. */
  private applyInitialLevels(): void {
    for (const control of this.controls.values()) {
      const min = sliderMin(control);
      if (control.type === 'slider' && !this.values.has(control.id) && controlToDmxValue(control, min) > 0) {
        this.values.set(control.id, min);
        this.writeDmx(control, min);
      }
    }
  }

  private applyInput(controlId: string, value: number): void {
    const control = this.controls.get(controlId);
    if (!control || !Number.isFinite(value)) {
      return;
    }
    if (control.type === 'audioTriggers') {
      this.applyAudioInput(control, value);
    } else if (control.type === 'slider') {
      this.setValue(control, clamp(value, sliderMin(control), sliderMax(control)));
    } else if (control.functionPublicId) {
      this.applyFunctionButton(control, control.functionPublicId, value > 0);
    } else {
      this.applyButton(control, value > 0);
    }
  }

  private releaseFlashButtons(controlIds: string[]): void {
    for (const controlId of controlIds) {
      const control = this.controls.get(controlId);
      const releasesOnDisconnect =
        (control?.type === 'button' && control.buttonMode !== 'toggle') || control?.type === 'audioTriggers';
      if (releasesOnDisconnect) {
        this.applyInput(controlId, 0);
      }
    }
  }

  private applyButton(control: VirtualConsoleControl, pressed: boolean): void {
    const upper = control.upperLimit ?? DMX_MAX;
    if (control.buttonMode !== 'toggle') {
      this.setValue(control, pressed ? upper : 0);
    } else if (pressed) {
      this.setValue(control, (this.values.get(control.id) ?? 0) > 0 ? 0 : upper);
    }
  }

  private applyMidiInput(entryPublicId: string, value: number): void {
    for (const control of this.controls.values()) {
      if (control.midiEntryPublicId === entryPublicId) {
        const ratio = clamp(value, 0, MIDI_MAX) / MIDI_MAX;
        const min = sliderMin(control);
        this.applyInput(
          control.id,
          control.type === 'slider' ? Math.round(min + ratio * (sliderMax(control) - min)) : value,
        );
      }
    }
  }

  private applyFunctionButton(control: VirtualConsoleControl, functionPublicId: string, pressed: boolean) {
    const toggle = control.buttonMode === 'toggle';
    if (toggle && !pressed) {
      return;
    }
    const start = toggle ? !this.running.has(functionPublicId) : pressed;
    if (start) {
      this.startedBy.set(functionPublicId, control.id);
      // The button replaces any audio-started runner: releasing the audio hold must not stop the button's run.
      this.audioStarted.delete(functionPublicId);
    }
    this.eventEmitter.emit(start ? 'function.start' : 'function.stop', { functionPublicId });
  }

  private applyAudioInput(control: VirtualConsoleControl, value: number): void {
    const wasPressed = (this.audioInputs.get(control.id) ?? 0) > 0;
    this.audioInputs.set(control.id, value);
    if (value > 0 && !wasPressed) this.toggleAudio(control);
  }

  private toggleAudio(control: VirtualConsoleControl): void {
    const enabled = this.audio.has(control.id);
    if (enabled) {
      this.releaseAudio(control);
    } else {
      this.audio.set(control.id, emptyAudioState());
      this.armBeat(control);
    }
    this.setValue(control, enabled ? 0 : DMX_MAX);
  }

  /** A function already running is left alone: the hold starts only an idle one, and free runners ignore steps. */
  private armBeat(control: VirtualConsoleControl): void {
    const functionPublicId = control.beatBar?.functionPublicId;
    if (functionPublicId) this.holdBarFunction(beatKey(control), functionPublicId, true);
  }

  private applyBeat(level: number): void {
    // One step per beat, however many controls share the function; the first control's timing wins.
    const stepped = new Map<string, StepTiming | undefined>();
    for (const [controlId, state] of this.audio) {
      const beatBar = this.controls.get(controlId)?.beatBar;
      if (level * PERCENT < (beatBar?.minThreshold ?? VIRTUAL_CONSOLE_BEAT_DEFAULT_THRESHOLD)) continue;
      state.beat = 1;
      state.lastBeatAt = Date.now();
      state.gapMs = state.tempo.push(state.lastBeatAt);
      const timing = beatStepTiming(beatBar, state.gapMs);
      if (beatBar?.functionPublicId && !stepped.has(beatBar.functionPublicId)) {
        stepped.set(beatBar.functionPublicId, timing);
      }
    }
    for (const [functionPublicId, timing] of stepped) {
      this.eventEmitter.emit('function.step', { functionPublicId, ...(timing ? { timing } : {}) });
    }
  }

  private applySpectrum(frame: SpectrumFrame): void {
    const now = Date.now();
    const elapsed = Math.min(now - this.lastSpectrumAt, MAX_SPECTRUM_GAP_MS);
    this.lastSpectrumAt = now;
    if (this.audio.size === 0) return;

    const updates: DmxValue[] = [];
    const levels: Record<string, number[]> = {};
    const bpm: Record<string, number> = {};
    for (const [controlId, state] of this.audio) {
      const control = this.controls.get(controlId);
      if (!control) continue;
      state.levels = barLevels(control, frame).map((level, bar) => smoothLevel(state.levels[bar] ?? 0, level, elapsed));
      (control.audioBars ?? []).forEach((bar, index) => {
        updates.push(...this.applyBar(control, bar, index, state));
      });
      state.beat = smoothLevel(state.beat, 0, elapsed);
      levels[controlId] = [...state.levels, state.beat].map(roundLevel);
      const known = knownBpm(state, now);
      if (known !== undefined) bpm[controlId] = known;
    }
    this.emitDmx(updates);
    this.emitAudioLevels(levels, bpm);
  }

  // Rounded and deduplicated: during silence nothing changes, so nothing is broadcast.
  private emitAudioLevels(levels: Record<string, number[]>, bpm: Record<string, number>): void {
    const serialized = JSON.stringify([levels, bpm]);
    if (serialized === this.lastLevels || Object.keys(levels).length === 0) return;
    this.lastLevels = serialized;
    this.eventEmitter.emit('virtualConsole.audioLevels', { levels, bpm });
  }

  private applyBar(control: VirtualConsoleControl, bar: VirtualConsoleAudioBar, index: number, state: AudioState) {
    if (bar.mode === 'channels') return this.applyChannelBar(control, bar, index, state);
    if (bar.mode === 'function' && bar.functionPublicId) {
      this.applyFunctionBar(`${control.id}:${index}`, bar, bar.functionPublicId, index, state);
    }
    return [];
  }

  private applyChannelBar(
    control: VirtualConsoleControl,
    bar: VirtualConsoleAudioBar,
    index: number,
    state: AudioState,
  ) {
    const dmx = thresholdDmx(state.levels[index] ?? 0, bar);
    if (dmx === (state.dmx[index] ?? 0)) return [];
    state.dmx[index] = dmx;
    return this.output.applyLevel(`${control.id}:${index}`, bar.channelBindings ?? [], dmx, this.fixtures);
  }

  private applyFunctionBar(
    key: string,
    bar: VirtualConsoleAudioBar,
    functionPublicId: string,
    index: number,
    state: AudioState,
  ): void {
    const wasActive = state.active[index] ?? false;
    const active = nextFunctionState(state.levels[index] ?? 0, bar, wasActive);
    if (active === wasActive) return;
    state.active[index] = active;
    this.holdBarFunction(key, functionPublicId, active);
  }

  /**
   * A new holder starts the function unless it already runs (stepped while a beat bar holds it), the last one to let
   * go stops it. Holders may outlive a function stopped elsewhere, so their count says nothing about whether it runs.
   */
  private holdBarFunction(key: string, functionPublicId: string, held: boolean): void {
    const holders = this.audioHolders.get(functionPublicId) ?? new Set<string>();
    if (held) holders.add(key);
    else holders.delete(key);
    this.audioHolders.set(functionPublicId, holders);
    if (held && !this.running.has(functionPublicId) && !this.audioStarted.has(functionPublicId)) {
      this.audioStarted.add(functionPublicId);
      const stepped = [...holders].some(holder => holder.endsWith(BEAT_KEY_SUFFIX));
      this.eventEmitter.emit('function.start', { functionPublicId, ...(stepped ? { stepped } : {}) });
    } else if (holders.size === 0 && this.audioStarted.delete(functionPublicId)) {
      this.eventEmitter.emit('function.stop', { functionPublicId });
    }
  }

  private releaseAudio(control: VirtualConsoleControl): void {
    const state = this.audio.get(control.id);
    if (!state) return;
    this.audio.delete(control.id);
    const beatFunction = control.beatBar?.functionPublicId;
    if (beatFunction) this.holdBarFunction(beatKey(control), beatFunction, false);
    const updates = (control.audioBars ?? []).flatMap((bar, index) => {
      if (bar.functionPublicId && state.active[index]) {
        this.holdBarFunction(`${control.id}:${index}`, bar.functionPublicId, false);
      }
      return (state.dmx[index] ?? 0) > 0
        ? this.output.applyLevel(`${control.id}:${index}`, bar.channelBindings ?? [], 0, this.fixtures)
        : [];
    });
    this.emitDmx(updates);
  }

  private setValue(control: VirtualConsoleControl, value: number): void {
    this.values.set(control.id, value);
    this.writeDmx(control, value);
    this.emitState();
  }

  private release(control: VirtualConsoleControl): void {
    this.releaseAudio(control);
    const functionPublicId = control.functionPublicId;
    if (functionPublicId && this.startedBy.get(functionPublicId) === control.id) {
      this.startedBy.delete(functionPublicId);
      this.eventEmitter.emit('function.stop', { functionPublicId });
    }
    if (controlToDmxValue(control, this.values.get(control.id) ?? 0) > 0) {
      // As DMX, so a percentage slider goes dark instead of back to its lowerLimit.
      this.writeDmx({ ...control, valueType: 'dmx' }, 0);
    }
    this.values.delete(control.id);
  }

  private writeDmx(control: VirtualConsoleControl, value: number): void {
    this.emitDmx(this.output.apply(control, value, this.fixtures));
  }

  private emitDmx(updates: DmxValue[]): void {
    if (updates.length > 0) {
      this.eventEmitter.emit('dmx.manualValues', updates);
    }
  }

  private emitState(): void {
    this.eventEmitter.emit('virtualConsole.state', { values: Object.fromEntries(this.values) });
    this.emitFeedback();
  }

  private emitFeedback(): void {
    const entries: VirtualConsoleFeedback[] = [];
    for (const control of this.controls.values()) {
      if (control.midiEntryPublicId) {
        entries.push({
          entryPublicId: control.midiEntryPublicId,
          state: this.ledState(control),
          feedback: control.feedback ?? null,
        });
      }
    }
    this.eventEmitter.emit('virtualConsole.feedback', { entries });
  }

  private ledState(control: VirtualConsoleControl): VirtualConsoleLedState {
    const functionPublicId = control.functionPublicId;
    if (!functionPublicId) {
      return (this.values.get(control.id) ?? 0) > 0 ? 'on' : 'off';
    }
    if (!this.running.has(functionPublicId)) {
      return 'off';
    }
    return this.startedBy.get(functionPublicId) === control.id ? 'on' : 'monitor';
  }
}

const emptyAudioState = (): AudioState => ({
  levels: [],
  dmx: [],
  active: [],
  beat: 0,
  tempo: new BeatTempo(),
  lastBeatAt: 0,
});

function knownBpm({ gapMs, lastBeatAt }: AudioState, now: number): number | undefined {
  return gapMs !== undefined && now - lastBeatAt <= BPM_TIMEOUT_MS ? Math.round(MS_PER_MINUTE / gapMs) : undefined;
}

/** Step timing in ms from the beat bar's percentages; none until a beat gap is known, so the sequence's own applies. */
function beatStepTiming(beatBar: VirtualConsoleBeatBar | undefined, gapMs: number | undefined): StepTiming | undefined {
  const timing = beatBar?.timing;
  if (!timing || gapMs === undefined) return undefined;
  const part = (percent: number) => Math.round((gapMs * percent) / PERCENT);
  return { fadeIn: part(timing.fadeIn), hold: part(timing.hold), fadeOut: part(timing.fadeOut) };
}
const BEAT_KEY_SUFFIX = ':beat';
const beatKey = (control: VirtualConsoleControl) => `${control.id}${BEAT_KEY_SUFFIX}`;
const roundLevel = (level: number) => Math.round(level * 1000) / 1000;

function sameAudioBars(previous: VirtualConsoleControl, next: VirtualConsoleControl): boolean {
  // Beat timing is read on every beat, so changing it must not re-arm the function or drop the measured tempo.
  const bars = ({ bandCount, audioBars, beatBar }: VirtualConsoleControl) =>
    JSON.stringify([bandCount, audioBars, beatBar && { ...beatBar, timing: undefined }]);
  return bars(previous) === bars(next);
}

function flattenPlayable(controls: readonly VirtualConsoleControl[]): VirtualConsoleControl[] {
  return controls.flatMap(control => [
    ...(control.type === 'frame' ? [] : [control]),
    ...flattenPlayable(control.children ?? []),
  ]);
}

function boundFixtures(fixtures: LoadedProject['projectFixtures'] | undefined): VirtualConsoleBoundFixture[] {
  return (fixtures ?? []).flatMap(({ publicId, startAddress, fixtureChannelMode }) =>
    publicId && fixtureChannelMode
      ? [
          {
            publicId,
            startAddress,
            channelMode: {
              fixtureChannelAssignments: fixtureChannelMode.fixtureChannelAssignments.flatMap(assignment =>
                assignment.publicId ? [{ publicId: assignment.publicId, channelNumber: assignment.channelNumber }] : [],
              ),
            },
          },
        ]
      : [],
  );
}

const sliderMin = (control: VirtualConsoleControl) =>
  control.valueType === 'percentage' ? 0 : (control.lowerLimit ?? 0);
const sliderMax = (control: VirtualConsoleControl) =>
  control.valueType === 'percentage' ? 100 : (control.upperLimit ?? DMX_MAX);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
