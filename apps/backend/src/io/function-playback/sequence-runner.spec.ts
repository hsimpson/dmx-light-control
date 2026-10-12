import { SequenceDirection, SequenceProperties, SequenceRunOrder, SequenceStep } from '@/projects/project-function';
import { describe, expect, it } from 'vitest';
import { sequenceFrame } from './sequence-runner';

function step(
  order: number,
  value: number,
  timing: Partial<Pick<SequenceStep, 'fadeIn' | 'hold' | 'fadeOut'>> = {},
): SequenceStep {
  return {
    order,
    fadeIn: timing.fadeIn ?? 0,
    hold: timing.hold ?? 1000,
    fadeOut: timing.fadeOut ?? 0,
    dmxValues: [{ channel: 1, value }],
  };
}

function sequence(steps: SequenceStep[], overrides: Partial<SequenceProperties> = {}): SequenceProperties {
  return {
    direction: SequenceDirection.Forward,
    runOrder: SequenceRunOrder.Loop,
    steps,
    ...overrides,
  };
}

describe('sequenceFrame', () => {
  it('walks forward and backward', () => {
    const steps = [step(0, 10), step(1, 20)];
    expect(sequenceFrame(sequence(steps), 0).values).toEqual([{ channel: 1, value: 10 }]);
    expect(sequenceFrame(sequence(steps), 1000).values).toEqual([{ channel: 1, value: 20 }]);
    expect(sequenceFrame(sequence(steps, { direction: SequenceDirection.Backward }), 0).values).toEqual([
      { channel: 1, value: 20 },
    ]);
  });

  it('loops, plays a single shot once, and ping-pongs without repeating the end step', () => {
    const steps = [step(0, 10), step(1, 20), step(2, 30)];
    expect(sequenceFrame(sequence(steps, { runOrder: SequenceRunOrder.Loop }), 3000).values).toEqual([
      { channel: 1, value: 10 },
    ]);
    const single = sequenceFrame(sequence(steps, { runOrder: SequenceRunOrder.SingleShot }), 3000);
    expect(single.finished).toBe(true);
    expect(sequenceFrame(sequence(steps, { runOrder: SequenceRunOrder.PingPong }), 3000).values).toEqual([
      { channel: 1, value: 20 },
    ]);
  });

  it('fades in from the current output and crossfades when fadeOut is 0', () => {
    const first = step(0, 0, { fadeIn: 0, hold: 0, fadeOut: 0 });
    const steps = [
      {
        ...first,
        dmxValues: [
          { channel: 1, value: 0 },
          { channel: 2, value: 100 },
        ],
      },
      step(1, 100, { fadeIn: 100, hold: 0, fadeOut: 0 }),
    ];
    const mid = sequenceFrame(sequence(steps, { runOrder: SequenceRunOrder.SingleShot }), 50);
    expect(mid.values).toEqual([
      { channel: 1, value: 50 },
      { channel: 2, value: 50 },
    ]);
  });

  it('fades a channel missing from the next step down to 0', () => {
    const steps = [
      { order: 0, fadeIn: 0, hold: 0, fadeOut: 0, dmxValues: [{ channel: 2, value: 100 }] },
      { order: 1, fadeIn: 100, hold: 0, fadeOut: 0, dmxValues: [{ channel: 1, value: 100 }] },
    ];
    const mid = sequenceFrame(sequence(steps, { runOrder: SequenceRunOrder.SingleShot }), 50);
    expect(mid.values).toEqual([
      { channel: 1, value: 50 },
      { channel: 2, value: 50 },
    ]);
  });

  it('fades out to 0 before the next step when fadeOut is greater than 0', () => {
    const steps = [
      step(0, 100, { fadeIn: 0, hold: 0, fadeOut: 100 }),
      step(1, 0, { fadeIn: 0, hold: 100, fadeOut: 0 }),
    ];
    expect(sequenceFrame(sequence(steps, { runOrder: SequenceRunOrder.SingleShot }), 50).values).toEqual([
      { channel: 1, value: 50 },
    ]);
    expect(sequenceFrame(sequence(steps, { runOrder: SequenceRunOrder.SingleShot }), 100).values).toEqual([]);
  });
});
