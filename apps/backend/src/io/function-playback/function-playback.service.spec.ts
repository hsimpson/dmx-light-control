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

  function steppedRow(runOrder = SequenceRunOrder.Loop) {
    return {
      ...sequenceRow(runOrder),
      properties: {
        type: ProjectFunctionType.Sequence,
        sequence: {
          direction: SequenceDirection.Forward,
          runOrder,
          steps: [
            { fadeIn: 0, hold: 100, fadeOut: 100, dmxValues: [{ channel: 4, value: 80 }] },
            { fadeIn: 100, hold: 100, fadeOut: 0, dmxValues: [{ channel: 4, value: 200 }] },
          ],
        },
      },
    };
  }

  it('GIVEN a stepped start WHEN no beat came yet THEN it runs dark', async () => {
    const { service, functions, universe } = build();
    functions.findOneByPublicId.mockResolvedValue(steppedRow());

    await service.start(FUNCTION_ID, true);
    vi.advanceTimersByTime(5000);

    expect(service.runningIds()).toEqual([FUNCTION_ID]);
    expect(universe.getFrame()[4]).toBe(0);
  });

  it('GIVEN a stepped function WHEN beats arrive THEN each plays one step and timing alone never advances', async () => {
    const { service, functions, universe } = build();
    functions.findOneByPublicId.mockResolvedValue(steppedRow());
    await service.start(FUNCTION_ID, true);

    service.step(FUNCTION_ID);
    expect(universe.getFrame()[4]).toBe(80);

    vi.advanceTimersByTime(5000);
    expect(universe.getFrame()[4]).toBe(0);

    service.step(FUNCTION_ID);
    vi.advanceTimersByTime(5000);
    expect(universe.getFrame()[4]).toBe(200);
  });

  it('GIVEN a beat during a step WHEN the next step fades in THEN it starts from the current output', async () => {
    const { service, functions, universe } = build();
    functions.findOneByPublicId.mockResolvedValue(steppedRow());
    await service.start(FUNCTION_ID, true);
    service.step(FUNCTION_ID);
    vi.advanceTimersByTime(50);

    service.step(FUNCTION_ID);
    expect(universe.getFrame()[4]).toBe(80);

    vi.advanceTimersByTime(50);
    expect(universe.getFrame()[4]).toBe(140);
  });

  it('GIVEN a free-running function WHEN a step arrives THEN it is ignored', async () => {
    const { service, functions, universe } = build();
    functions.findOneByPublicId.mockResolvedValue(steppedRow());
    await service.start(FUNCTION_ID);

    service.step(FUNCTION_ID);

    expect(universe.getFrame()[4]).toBe(80);
    // 50 ms into the second step's fade from 0: its own timing. A step taken would already read 200.
    vi.advanceTimersByTime(250);
    expect(universe.getFrame()[4]).toBe(100);
  });

  it('GIVEN a function that is not running WHEN a step arrives THEN nothing happens', () => {
    const { service, universe } = build();

    service.step(FUNCTION_ID);

    expect(service.runningIds()).toEqual([]);
    expect(universe.getFrame()[4]).toBe(0);
  });

  it('GIVEN a stepped single shot WHEN its last step played out THEN the function ends', async () => {
    const { service, functions, universe, states } = build();
    functions.findOneByPublicId.mockResolvedValue(steppedRow(SequenceRunOrder.SingleShot));
    await service.start(FUNCTION_ID, true);

    service.step(FUNCTION_ID);
    vi.advanceTimersByTime(1000);
    expect(service.runningIds()).toEqual([FUNCTION_ID]);

    service.step(FUNCTION_ID);
    vi.advanceTimersByTime(1000);

    expect(service.runningIds()).toEqual([]);
    expect(states.at(-1)).toEqual([]);
    expect(universe.getFrame()[4]).toBe(0);
  });

  it('GIVEN a single shot on its last step WHEN an extra beat arrives THEN the step still plays out', async () => {
    const { service, functions, universe } = build();
    functions.findOneByPublicId.mockResolvedValue(steppedRow(SequenceRunOrder.SingleShot));
    await service.start(FUNCTION_ID, true);
    service.step(FUNCTION_ID);
    service.step(FUNCTION_ID);
    vi.advanceTimersByTime(150);
    expect(universe.getFrame()[4]).toBe(200);

    service.step(FUNCTION_ID);

    expect(universe.getFrame()[4]).toBe(200);
    expect(service.runningIds()).toEqual([FUNCTION_ID]);
    vi.advanceTimersByTime(100);
    expect(service.runningIds()).toEqual([]);
  });

  it('GIVEN a beat during a fade out WHEN the next step fades in THEN the output does not jump', async () => {
    const { service, functions, universe } = build();
    functions.findOneByPublicId.mockResolvedValue({
      ...sequenceRow(SequenceRunOrder.Loop),
      properties: {
        type: ProjectFunctionType.Sequence,
        sequence: {
          direction: SequenceDirection.Forward,
          runOrder: SequenceRunOrder.Loop,
          steps: [
            { fadeIn: 0, hold: 0, fadeOut: 100, dmxValues: [{ channel: 4, value: 200 }] },
            { fadeIn: 100, hold: 100, fadeOut: 0, dmxValues: [{ channel: 4, value: 40 }] },
          ],
        },
      },
    });
    await service.start(FUNCTION_ID, true);
    service.step(FUNCTION_ID);
    vi.advanceTimersByTime(50);
    expect(universe.getFrame()[4]).toBe(100);

    service.step(FUNCTION_ID);
    expect(universe.getFrame()[4]).toBe(100);

    vi.advanceTimersByTime(50);
    expect(universe.getFrame()[4]).toBe(70);
  });

  it('GIVEN a free-running function WHEN restarted as stepped THEN it goes dark until a beat', async () => {
    const { service, functions, universe } = build();
    functions.findOneByPublicId.mockResolvedValue(steppedRow());
    await service.start(FUNCTION_ID);
    expect(universe.getFrame()[4]).toBe(80);

    await service.start(FUNCTION_ID, true);

    expect(universe.getFrame()[4]).toBe(0);
  });

  it('GIVEN a stepped function WHEN restarted as free-running THEN later beats are ignored', async () => {
    const { service, functions, universe } = build();
    functions.findOneByPublicId.mockResolvedValue(steppedRow());
    await service.start(FUNCTION_ID, true);

    await service.start(FUNCTION_ID);
    service.step(FUNCTION_ID);
    vi.advanceTimersByTime(250);

    expect(universe.getFrame()[4]).toBe(100);
  });

  it('GIVEN a free-running function beside a stepped one WHEN beats arrive THEN its output keeps its own timing', async () => {
    const { service, functions, universe } = build();
    const otherId = '22222222-2222-4222-8222-222222222222';
    const otherRow = {
      ...sequenceRow(SequenceRunOrder.Loop),
      properties: {
        type: ProjectFunctionType.Sequence,
        sequence: {
          direction: SequenceDirection.Forward,
          runOrder: SequenceRunOrder.Loop,
          steps: [{ fadeIn: 0, hold: 100, fadeOut: 0, dmxValues: [{ channel: 9, value: 255 }] }],
        },
      },
    };
    functions.findOneByPublicId.mockResolvedValueOnce(steppedRow()).mockResolvedValueOnce(otherRow);
    await service.start(FUNCTION_ID);
    await service.start(otherId, true);

    for (let beat = 0; beat < 5; beat++) {
      service.step(otherId);
      vi.advanceTimersByTime(200);
    }
    vi.advanceTimersByTime(50);

    // 1050 ms into a 400 ms cycle: 50 ms into the second step's fade from 0 to 200.
    expect(universe.getFrame()[4]).toBe(100);
    expect(universe.getFrame()[9]).toBe(255);
    service.stop(otherId);
  });

  it('GIVEN a stepped function WHEN stopped THEN its output is released', async () => {
    const { service, functions, universe } = build();
    functions.findOneByPublicId.mockResolvedValue(steppedRow());
    await service.start(FUNCTION_ID, true);
    service.step(FUNCTION_ID);

    service.stop(FUNCTION_ID);

    expect(universe.getFrame()[4]).toBe(0);
  });

  it('GIVEN function events WHEN a stepped start and a step are emitted THEN the function follows them', async () => {
    const { service, functions, universe, listeners, states } = build();
    functions.findOneByPublicId.mockResolvedValue(steppedRow());

    listeners.get('function.start')?.({ functionPublicId: FUNCTION_ID, stepped: true } as never);
    await vi.waitFor(() => {
      expect(states.at(-1)).toEqual([FUNCTION_ID]);
    });
    expect(universe.getFrame()[4]).toBe(0);

    listeners.get('function.step')?.({ functionPublicId: FUNCTION_ID } as never);

    expect(universe.getFrame()[4]).toBe(80);
    service.stop(FUNCTION_ID);
  });

  it('GIVEN a start still loading WHEN stop arrives first (quick flash press) THEN the function does not run', async () => {
    const { service, functions, universe } = build();
    functions.findOneByPublicId.mockResolvedValue(sequenceRow(SequenceRunOrder.Loop));

    const starting = service.start(FUNCTION_ID);
    service.stop(FUNCTION_ID);
    await starting;

    expect(service.runningIds()).toEqual([]);
    expect(universe.getFrame()[4]).toBe(0);
  });

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
