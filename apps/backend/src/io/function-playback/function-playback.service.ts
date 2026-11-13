import { AppEventEmitter } from '@/events/app-event-emitter';
import { DmxUniverseService } from '@/io/dmx/dmx-universe.service';
import {
  type SequenceChannelValue,
  sequenceFrame,
  type SequenceStart,
  stepDurationAt,
  type StepTiming,
  steppedFrame,
} from '@/io/function-playback/sequence-runner';
import { SequenceProperties, SequenceRunOrder } from '@/projects/project-function';
import { ProjectFunctionRepository } from '@/projects/repositories/project-function.repository';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

const TICK_MS = 25;
/** A tapped step holds this many tap gaps before the sequence free-runs again: a slightly late tap still counts. */
const TAP_OVERDUE_GAPS = 1.5;

type Runner = {
  sequence: SequenceProperties;
  startedAt: number;
  /** Where free-running continues from; moves on when a tapped step hands back. */
  start: SequenceStart;
  /** Set when beats drive the steps instead of their timing. */
  stepped?: { beats: number; beatAt: number; from: SequenceChannelValue[]; timing?: StepTiming };
  /** Set while a tapped step of a free-running sequence plays; its timing runs again `until` then. */
  tapped?: { index: number; at: number; until: number; from: SequenceChannelValue[]; timing?: StepTiming };
  lastValues: SequenceChannelValue[];
  /** Raw index of the step playing now. */
  lastIndex: number;
};

@Injectable()
export class FunctionPlaybackService implements OnModuleInit, OnModuleDestroy {
  private readonly runners = new Map<string, Runner>();
  // A stop that arrives while start awaits the database (quick flash press) must cancel that start.
  private readonly pendingStarts = new Map<string, symbol>();
  private timer: ReturnType<typeof setInterval> | undefined;

  public constructor(
    private readonly functions: ProjectFunctionRepository,
    private readonly universe: DmxUniverseService,
    private readonly eventEmitter: AppEventEmitter,
  ) {}

  public onModuleInit(): void {
    this.eventEmitter.on('function.start', payload => {
      void this.start(payload.functionPublicId, payload.stepped);
    });
    this.eventEmitter.on('function.step', payload => {
      this.step(payload.functionPublicId, payload.timing);
    });
    this.eventEmitter.on('function.tap', payload => {
      this.tap(payload.timing, payload.gapMs);
    });
    this.eventEmitter.on('function.stop', payload => {
      this.stop(payload.functionPublicId);
    });
    this.eventEmitter.on('function.deleted', payload => {
      this.stop(payload.functionPublicId);
    });
    this.eventEmitter.on('function.state.request', () => {
      this.emitState();
    });
  }

  public onModuleDestroy(): void {
    this.stopTicker();
    for (const functionPublicId of [...this.runners.keys()]) {
      this.stop(functionPublicId);
    }
  }

  public runningIds(): string[] {
    return [...this.runners.keys()].sort();
  }

  public async start(functionPublicId: string, stepped = false): Promise<void> {
    const startToken = Symbol(functionPublicId);
    this.pendingStarts.set(functionPublicId, startToken);
    const row = await this.functions.findOneByPublicId(functionPublicId);
    if (this.pendingStarts.get(functionPublicId) !== startToken) {
      return;
    }
    this.pendingStarts.delete(functionPublicId);
    if (!row) {
      return;
    }
    this.runners.set(functionPublicId, {
      sequence: row.properties.sequence,
      startedAt: Date.now(),
      start: { index: 0, from: [] },
      ...(stepped ? { stepped: { beats: 0, beatAt: Date.now(), from: [] } } : {}),
      lastValues: [],
      lastIndex: 0,
    });
    this.ensureTicker();
    this.tick();
    this.emitState();
  }

  /** Plays the next step of a beat-driven function at once, with `timing` instead of the step's own when given. */
  public step(functionPublicId: string, timing?: StepTiming): void {
    const runner = this.runners.get(functionPublicId);
    if (!runner?.stepped) {
      return;
    }
    const { runOrder, steps } = runner.sequence;
    // Its last step plays out in full: a further beat must not cut it short.
    if (runOrder === SequenceRunOrder.SingleShot && runner.stepped.beats >= steps.length) {
      return;
    }
    runner.stepped = { beats: runner.stepped.beats + 1, beatAt: Date.now(), from: runner.lastValues, timing };
    this.tick();
  }

  /**
   * One tap for every running function: beat-driven ones play their next beat step, free-running ones jump to their
   * next step now and free-run again once the next tap is overdue (`gapMs`) or, with no gap known, the step played out.
   */
  public tap(timing?: StepTiming, gapMs?: number): void {
    const now = Date.now();
    for (const [functionPublicId, runner] of this.runners) {
      if (runner.stepped) {
        this.step(functionPublicId, timing);
        continue;
      }
      const index = runner.lastIndex + 1;
      const { runOrder, steps } = runner.sequence;
      if (runOrder === SequenceRunOrder.SingleShot && index >= steps.length) {
        continue;
      }
      const holdMs = gapMs === undefined ? stepDurationAt(runner.sequence, index, timing) : gapMs * TAP_OVERDUE_GAPS;
      runner.tapped = { index, at: now, until: now + holdMs, from: runner.lastValues, timing };
    }
    this.tick();
  }

  public stop(functionPublicId: string): void {
    this.pendingStarts.delete(functionPublicId);
    if (!this.runners.delete(functionPublicId)) {
      return;
    }
    const deltas = this.universe.clearLayer(functionPublicId);
    if (deltas.length > 0) {
      this.eventEmitter.emit('dmx.channelValues', deltas);
    }
    this.emitState();
    if (this.runners.size === 0) {
      this.stopTicker();
    }
  }

  private tick(): void {
    const now = Date.now();
    let stateChanged = false;
    for (const [functionPublicId, runner] of this.runners) {
      const frame = this.frame(runner, now);
      runner.lastValues = frame.values;
      if (frame.finished) {
        this.runners.delete(functionPublicId);
        const deltas = this.universe.clearLayer(functionPublicId);
        if (deltas.length > 0) {
          this.eventEmitter.emit('dmx.channelValues', deltas);
        }
        stateChanged = true;
        continue;
      }
      const deltas = this.universe.setLayer(functionPublicId, frame.values);
      if (deltas.length > 0) {
        this.eventEmitter.emit('dmx.channelValues', deltas);
      }
    }
    if (stateChanged) {
      this.emitState();
    }
    if (this.runners.size === 0) {
      this.stopTicker();
    }
  }

  private frame(runner: Runner, now: number) {
    if (runner.stepped) {
      const { beats, beatAt, from, timing } = runner.stepped;
      return steppedFrame(runner.sequence, beats, now - beatAt, from, timing);
    }
    // A single shot's last tapped step plays out in full: there is no next step to hand back to.
    if (runner.tapped && (now < runner.tapped.until || isLastStep(runner.sequence, runner.tapped.index))) {
      const { index, at, from, timing } = runner.tapped;
      runner.lastIndex = index;
      return steppedFrame(runner.sequence, index + 1, now - at, from, timing);
    }
    if (runner.tapped) {
      runner.start = { index: runner.tapped.index + 1, from: runner.lastValues };
      runner.startedAt = runner.tapped.until;
      runner.tapped = undefined;
    }
    const frame = sequenceFrame(runner.sequence, now - runner.startedAt, runner.start);
    runner.lastIndex = frame.index;
    return frame;
  }

  private ensureTicker(): void {
    if (this.timer !== undefined) {
      return;
    }
    this.timer = setInterval(() => {
      this.tick();
    }, TICK_MS);
  }

  private stopTicker(): void {
    if (this.timer === undefined) {
      return;
    }
    clearInterval(this.timer);
    this.timer = undefined;
  }

  private emitState(): void {
    this.eventEmitter.emit('function.state', { running: this.runningIds() });
  }
}

const isLastStep = ({ runOrder, steps }: SequenceProperties, index: number) =>
  runOrder === SequenceRunOrder.SingleShot && index + 1 >= steps.length;
