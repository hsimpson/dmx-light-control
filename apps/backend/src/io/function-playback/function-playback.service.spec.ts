import { AppEventEmitter } from '@/events/app-event-emitter';
import { DmxSendService } from '@/io/dmx/dmx-send.service';
import { DmxUniverseService } from '@/io/dmx/dmx-universe.service';
import { ProjectFunctionType, SequenceDirection, SequenceRunOrder } from '@/projects/project-function';
import { ProjectFunctionRepository } from '@/projects/repositories/project-function.repository';
import { EventEmitter2 } from 'eventemitter2';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FunctionPlaybackService } from './function-playback.service';

const FUNCTION_ID = '11111111-1111-4111-8111-111111111111';

function sequenceRow(runOrder: SequenceRunOrder, hold = 1000) {
  return {
    publicId: FUNCTION_ID,
    type: ProjectFunctionType.Sequence,
    properties: {
      type: ProjectFunctionType.Sequence,
      sequence: {
        direction: SequenceDirection.Forward,
        runOrder,
        steps: [{ fadeIn: 0, hold, fadeOut: 0, dmxValues: [{ channel: 4, value: 80 }] }],
      },
    },
  };
}

describe('FunctionPlaybackService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function build() {
    vi.useFakeTimers();
    const functions = {
      findOneByPublicId: vi.fn(),
    };
    const universe = new DmxUniverseService();
    const listeners = new Map<string, (payload: never) => void>();
    const states: string[][] = [];
    const eventEmitter = {
      on: (event: string, listener: (payload: never) => void) => {
        listeners.set(event, listener);
      },
      emit: (event: string, payload: never) => {
        if (event === 'function.state') {
          states.push((payload as { running: string[] }).running);
        }
        listeners.get(event)?.(payload);
        return true;
      },
    };
    const service = new FunctionPlaybackService(
      functions as unknown as ProjectFunctionRepository,
      universe,
      eventEmitter as unknown as AppEventEmitter,
    );
    service.onModuleInit();
    return { service, functions, universe, listeners, states };
  }

  it('starts, restarts, and stops a sequence', async () => {
    const { service, functions, universe, states } = build();
    functions.findOneByPublicId.mockResolvedValue(sequenceRow(SequenceRunOrder.Loop));

    await service.start(FUNCTION_ID);
    expect(universe.getFrame()[4]).toBe(80);
    expect(service.runningIds()).toEqual([FUNCTION_ID]);

    await service.start(FUNCTION_ID);
    expect(states.at(-1)).toEqual([FUNCTION_ID]);

    service.stop(FUNCTION_ID);
    expect(universe.getFrame()[4]).toBe(0);
    expect(service.runningIds()).toEqual([]);
  });

  it('clears a single shot when it finishes and stops when the function is deleted', async () => {
    const { service, functions, universe, listeners } = build();
    functions.findOneByPublicId.mockResolvedValue(sequenceRow(SequenceRunOrder.SingleShot, 30));
    await service.start(FUNCTION_ID);
    expect(universe.getFrame()[4]).toBe(80);

    await vi.advanceTimersByTimeAsync(80);
    expect(universe.getFrame()[4]).toBe(0);
    expect(service.runningIds()).toEqual([]);

    functions.findOneByPublicId.mockResolvedValue(sequenceRow(SequenceRunOrder.Loop));
    await service.start(FUNCTION_ID);
    listeners.get('function.deleted')?.({ functionPublicId: FUNCTION_ID } as never);
    expect(service.runningIds()).toEqual([]);
    expect(universe.getFrame()[4]).toBe(0);
  });

  it('loops a step that sets a channel back to 0', async () => {
    const { service, functions, universe } = build();
    functions.findOneByPublicId.mockResolvedValue({
      publicId: FUNCTION_ID,
      type: ProjectFunctionType.Sequence,
      properties: {
        type: ProjectFunctionType.Sequence,
        sequence: {
          direction: SequenceDirection.Forward,
          runOrder: SequenceRunOrder.Loop,
          steps: [
            { fadeIn: 0, hold: 55, fadeOut: 0, dmxValues: [{ channel: 3, value: 255 }] },
            { fadeIn: 0, hold: 55, fadeOut: 0, dmxValues: [{ channel: 3, value: 0 }] },
          ],
        },
      },
    });
    await service.start(FUNCTION_ID);
    expect(universe.getFrame()[3]).toBe(255);

    await vi.advanceTimersByTimeAsync(80);
    expect(universe.getFrame()[3]).toBe(0);
    expect(service.runningIds()).toEqual([FUNCTION_ID]);

    await vi.advanceTimersByTimeAsync(50);
    expect(universe.getFrame()[3]).toBe(255);
  });

  it('lets a later step replace the first step when manual updates share the universe', async () => {
    vi.useFakeTimers();
    const functions = { findOneByPublicId: vi.fn() };
    const universe = new DmxUniverseService();
    const eventEmitter = new AppEventEmitter(new EventEmitter2());
    const service = new FunctionPlaybackService(
      functions as unknown as ProjectFunctionRepository,
      universe,
      eventEmitter,
    );
    const manual = new DmxSendService(eventEmitter, universe);
    service.onModuleInit();
    manual.onModuleInit();
    functions.findOneByPublicId.mockResolvedValue({
      publicId: FUNCTION_ID,
      type: ProjectFunctionType.Sequence,
      properties: {
        type: ProjectFunctionType.Sequence,
        sequence: {
          direction: SequenceDirection.Forward,
          runOrder: SequenceRunOrder.Loop,
          steps: [
            {
              fadeIn: 0,
              hold: 55,
              fadeOut: 0,
              dmxValues: [
                { channel: 3, value: 255 },
                { channel: 6, value: 255 },
              ],
            },
            { fadeIn: 0, hold: 55, fadeOut: 0, dmxValues: [{ channel: 3, value: 0 }] },
          ],
        },
      },
    });

    await service.start(FUNCTION_ID);
    expect(universe.getFrame()[3]).toBe(255);
    expect(universe.getFrame()[6]).toBe(255);

    await vi.advanceTimersByTimeAsync(80);
    expect(universe.getFrame()[3]).toBe(0);
    expect(universe.getFrame()[6]).toBe(0);
  });

  it('answers a state request with the running ids', async () => {
    const { functions, listeners, states } = build();
    functions.findOneByPublicId.mockResolvedValue(sequenceRow(SequenceRunOrder.Loop));
    listeners.get('function.start')?.({ functionPublicId: FUNCTION_ID } as never);
    await vi.waitFor(() => {
      expect(states.at(-1)).toEqual([FUNCTION_ID]);
    });
    listeners.get('function.state.request')?.(undefined as never);
    expect(states.at(-1)).toEqual([FUNCTION_ID]);
  });
});
