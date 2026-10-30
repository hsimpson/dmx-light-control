import { AppEventEmitter } from '@/events/app-event-emitter';
import { LoadedProject, ProjectRepository } from '@/projects/repositories/project.repository';
import type { VirtualConsoleControl } from '@/projects/virtual-console';
import { Injectable, OnModuleInit } from '@nestjs/common';
import type { VirtualConsoleFeedback, VirtualConsoleLedState } from './virtual-console-events';
import { VirtualConsoleOutput, type VirtualConsoleBoundFixture } from './virtual-console-output';

const DMX_MAX = 255;
const MIDI_MAX = 127;

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
    this.eventEmitter.on('virtualConsole.state.request', () => {
      this.emitState();
    });
    this.eventEmitter.on('function.state', ({ running }) => {
      this.running = new Set(running);
      for (const functionPublicId of this.startedBy.keys()) {
        if (!this.running.has(functionPublicId)) {
          this.startedBy.delete(functionPublicId);
        }
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
      if (!sameProject || !controls.has(controlId)) {
        this.release(previous);
      }
    }
    this.projectPublicId = project?.publicId ?? null;
    this.controls = controls;
    this.fixtures = boundFixtures(project?.projectFixtures);
    if (!sameProject) {
      this.output = new VirtualConsoleOutput();
    }
    this.emitState();
  }

  private applyInput(controlId: string, value: number): void {
    const control = this.controls.get(controlId);
    if (!control || !Number.isFinite(value)) {
      return;
    }
    if (control.type === 'slider') {
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
      if (control?.type === 'button' && control.buttonMode !== 'toggle') {
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
    }
    this.eventEmitter.emit(start ? 'function.start' : 'function.stop', { functionPublicId });
  }

  private setValue(control: VirtualConsoleControl, value: number): void {
    this.values.set(control.id, value);
    this.writeDmx(control, value);
    this.emitState();
  }

  private release(control: VirtualConsoleControl): void {
    const functionPublicId = control.functionPublicId;
    if (functionPublicId && this.startedBy.get(functionPublicId) === control.id) {
      this.startedBy.delete(functionPublicId);
      this.eventEmitter.emit('function.stop', { functionPublicId });
    }
    if ((this.values.get(control.id) ?? 0) > 0) {
      this.writeDmx(control, 0);
    }
    this.values.delete(control.id);
  }

  private writeDmx(control: VirtualConsoleControl, value: number): void {
    const updates = this.output.apply(control, value, this.fixtures);
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
