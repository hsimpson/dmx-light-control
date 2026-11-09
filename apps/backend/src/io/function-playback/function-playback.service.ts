import { AppEventEmitter } from '@/events/app-event-emitter';
import { DmxUniverseService } from '@/io/dmx/dmx-universe.service';
import {
  type SequenceChannelValue,
  sequenceFrame,
  type StepTiming,
  steppedFrame,
} from '@/io/function-playback/sequence-runner';
import { SequenceProperties, SequenceRunOrder } from '@/projects/project-function';
import { ProjectFunctionRepository } from '@/projects/repositories/project-function.repository';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

const TICK_MS = 25;

type Runner = {
  sequence: SequenceProperties;
  startedAt: number;
  /** Set when beats drive the steps instead of their timing. */
  stepped?: { beats: number; beatAt: number; from: SequenceChannelValue[]; timing?: StepTiming };
  lastValues: SequenceChannelValue[];
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
      ...(stepped ? { stepped: { beats: 0, beatAt: Date.now(), from: [] } } : {}),
      lastValues: [],
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
      const frame = runner.stepped
        ? steppedFrame(
            runner.sequence,
            runner.stepped.beats,
            now - runner.stepped.beatAt,
            runner.stepped.from,
            runner.stepped.timing,
          )
        : sequenceFrame(runner.sequence, now - runner.startedAt);
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
