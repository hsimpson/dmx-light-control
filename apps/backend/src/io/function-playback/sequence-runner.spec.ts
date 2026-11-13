import { SequenceDirection, SequenceProperties, SequenceRunOrder, SequenceStep } from '@/projects/project-function';
import { describe, expect, it } from 'vitest';
import { sequenceFrame, steppedFrame } from './sequence-runner';

function step(value: number, timing: Partial<Pick<SequenceStep, 'fadeIn' | 'hold' | 'fadeOut'>> = {}): SequenceStep {
  return {
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

describe('steppedFrame', () => {
  const level = (value: number) => [{ channel: 1, value }];

  it('GIVEN no beat yet WHEN sampled THEN it is dark and still running', () => {
    expect(steppedFrame(sequence([step(10)]), 0, 500, [])).toEqual({ values: [], finished: false });
  });

  it('GIVEN several beats WHEN sampled THEN each beat plays the next step', () => {
    const steps = [step(10), step(20), step(30)];

    expect(steppedFrame(sequence(steps), 1, 0, []).values).toEqual(level(10));
    expect(steppedFrame(sequence(steps), 2, 0, []).values).toEqual(level(20));
    expect(steppedFrame(sequence(steps), 3, 0, []).values).toEqual(level(30));
  });

  it('GIVEN a beat WHEN its step fades in THEN it fades from the given output, not from the step timing', () => {
    const steps = [step(200, { fadeIn: 100, hold: 0, fadeOut: 0 })];

    expect(steppedFrame(sequence(steps), 1, 50, level(100)).values).toEqual(level(150));
  });

  it('GIVEN a step with fade out WHEN no next beat comes THEN it plays out once and stays dark', () => {
    const steps = [step(100, { fadeIn: 0, hold: 100, fadeOut: 100 })];

    expect(steppedFrame(sequence(steps), 1, 50, []).values).toEqual(level(100));
    expect(steppedFrame(sequence(steps), 1, 150, []).values).toEqual(level(50));
    expect(steppedFrame(sequence(steps), 1, 5000, []).values).toEqual([]);
  });

  it.each([
    ['a timed hold', { fadeIn: 0, hold: 100, fadeOut: 0 }],
    ['no duration at all', { fadeIn: 0, hold: 0, fadeOut: 0 }],
  ])('GIVEN a step with %s and no fade out WHEN no next beat comes THEN it holds its look', (_, timing) => {
    expect(steppedFrame(sequence([step(100, timing)]), 1, 5000, []).values).toEqual(level(100));
  });

  it('GIVEN more beats than steps in a loop WHEN sampled THEN it wraps around', () => {
    const steps = [step(10), step(20)];

    expect(steppedFrame(sequence(steps), 3, 0, []).values).toEqual(level(10));
    expect(steppedFrame(sequence(steps), 4, 0, []).values).toEqual(level(20));
  });

  it('GIVEN ping-pong WHEN beats pass the end THEN it walks back without repeating the end step', () => {
    const steps = [step(10), step(20), step(30)];
    const pingPong = sequence(steps, { runOrder: SequenceRunOrder.PingPong });

    const played = [1, 2, 3, 4, 5].map(count => steppedFrame(pingPong, count, 0, []).values[0]?.value);

    expect(played).toEqual([10, 20, 30, 20, 10]);
  });

  it('GIVEN backward direction WHEN beats arrive THEN it starts from the last step', () => {
    const backward = sequence([step(10), step(20)], { direction: SequenceDirection.Backward });

    expect(steppedFrame(backward, 1, 0, []).values).toEqual(level(20));
    expect(steppedFrame(backward, 2, 0, []).values).toEqual(level(10));
  });

  it('GIVEN a single shot WHEN its last step played out THEN it is finished, not before', () => {
    const shot = sequence([step(10), step(20)], { runOrder: SequenceRunOrder.SingleShot });

    expect(steppedFrame(shot, 1, 5000, []).finished).toBe(false);
    expect(steppedFrame(shot, 2, 500, []).finished).toBe(false);
    expect(steppedFrame(shot, 2, 1000, []).finished).toBe(true);
  });

  it('GIVEN a zero-duration last step of a single shot WHEN its beat arrives THEN it ends at once, like free-running', () => {
    const zero = { fadeIn: 0, hold: 0, fadeOut: 0 };
    const shot = sequence([step(10, zero), step(20, zero)], { runOrder: SequenceRunOrder.SingleShot });

    expect(steppedFrame(shot, 1, 0, []).finished).toBe(false);
    expect(steppedFrame(shot, 2, 0, []).finished).toBe(true);
    expect(sequenceFrame(shot, 0).finished).toBe(true);
  });

  it('GIVEN a channel the next step does not use WHEN that step fades in THEN the channel fades out with it', () => {
    const steps = [step(200, { fadeIn: 100, hold: 0, fadeOut: 0 })];

    expect(steppedFrame(sequence(steps), 1, 50, [{ channel: 2, value: 100 }]).values).toEqual([
      { channel: 1, value: 100 },
      { channel: 2, value: 50 },
    ]);
  });

  it('GIVEN a sequence without steps WHEN sampled THEN it is finished', () => {
    expect(steppedFrame(sequence([]), 1, 0, [])).toEqual({ values: [], finished: true });
  });

  it('GIVEN a timing override WHEN sampled THEN the step uses it instead of its own timing', () => {
    const steps = [step(100), step(200)];
    const timing = { fadeIn: 0, hold: 100, fadeOut: 100 };

    expect(steppedFrame(sequence(steps), 1, 50, [], timing).values).toEqual(level(100));
    expect(steppedFrame(sequence(steps), 1, 150, [], timing).values).toEqual(level(50));
    expect(steppedFrame(sequence(steps), 2, 5000, [], timing).values).toEqual([]);
  });

  it('GIVEN a timing override WHEN its fade in runs THEN it fades from the given output', () => {
    expect(steppedFrame(sequence([step(200)]), 1, 50, level(100), { fadeIn: 100, hold: 0, fadeOut: 0 }).values).toEqual(
      level(150),
    );
  });

  it('GIVEN a single shot with a timing override WHEN the override has played out THEN it is finished', () => {
    const shot = sequence([step(10), step(20)], { runOrder: SequenceRunOrder.SingleShot });
    const timing = { fadeIn: 0, hold: 200, fadeOut: 0 };

    expect(steppedFrame(shot, 2, 199, [], timing).finished).toBe(false);
    expect(steppedFrame(shot, 2, 200, [], timing).finished).toBe(true);
  });

  it('GIVEN a timing override with fade out WHEN the step has played out THEN it ends dark, not on the step look', () => {
    const shot = sequence([step(10)], { runOrder: SequenceRunOrder.SingleShot });

    expect(steppedFrame(shot, 1, 300, [], { fadeIn: 0, hold: 100, fadeOut: 100 })).toEqual({
      values: [],
      finished: true,
    });
  });
});

describe('sequenceFrame', () => {
  it('walks forward and backward', () => {
    const steps = [step(10), step(20)];
    expect(sequenceFrame(sequence(steps), 0).values).toEqual([{ channel: 1, value: 10 }]);
    expect(sequenceFrame(sequence(steps), 1000).values).toEqual([{ channel: 1, value: 20 }]);
    expect(sequenceFrame(sequence(steps, { direction: SequenceDirection.Backward }), 0).values).toEqual([
      { channel: 1, value: 20 },
    ]);
  });

  it('loops, plays a single shot once, and ping-pongs without repeating the end step', () => {
    const steps = [step(10), step(20), step(30)];
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
    const first = step(0, { fadeIn: 0, hold: 0, fadeOut: 0 });
    const steps = [
      {
        ...first,
        dmxValues: [
          { channel: 1, value: 0 },
          { channel: 2, value: 100 },
        ],
      },
      step(100, { fadeIn: 100, hold: 0, fadeOut: 0 }),
    ];
    const mid = sequenceFrame(sequence(steps, { runOrder: SequenceRunOrder.SingleShot }), 50);
    expect(mid.values).toEqual([
      { channel: 1, value: 50 },
      { channel: 2, value: 50 },
    ]);
  });

  it('fades a channel missing from the next step down to 0', () => {
    const steps = [
      { fadeIn: 0, hold: 0, fadeOut: 0, dmxValues: [{ channel: 2, value: 100 }] },
      { fadeIn: 100, hold: 0, fadeOut: 0, dmxValues: [{ channel: 1, value: 100 }] },
    ];
    const mid = sequenceFrame(sequence(steps, { runOrder: SequenceRunOrder.SingleShot }), 50);
    expect(mid.values).toEqual([
      { channel: 1, value: 50 },
      { channel: 2, value: 50 },
    ]);
  });

  it('loops a 255 then 0 step so the second step reaches the output', () => {
    const steps = [
      { fadeIn: 0, hold: 55, fadeOut: 0, dmxValues: [{ channel: 3, value: 255 }] },
      { fadeIn: 0, hold: 55, fadeOut: 0, dmxValues: [{ channel: 3, value: 0 }] },
    ];
    const sequenceProperties = sequence(steps, { runOrder: SequenceRunOrder.Loop });
    expect(sequenceFrame(sequenceProperties, 0)).toEqual({
      values: [{ channel: 3, value: 255 }],
      finished: false,
      index: 0,
    });
    expect(sequenceFrame(sequenceProperties, 54).values).toEqual([{ channel: 3, value: 255 }]);
    expect(sequenceFrame(sequenceProperties, 55).values).toEqual([{ channel: 3, value: 0 }]);
    expect(sequenceFrame(sequenceProperties, 109).values).toEqual([{ channel: 3, value: 0 }]);
    expect(sequenceFrame(sequenceProperties, 110)).toEqual({
      values: [{ channel: 3, value: 255 }],
      finished: false,
      index: 2,
    });
  });

  it('fades out to 0 before the next step when fadeOut is greater than 0', () => {
    const steps = [step(100, { fadeIn: 0, hold: 0, fadeOut: 100 }), step(0, { fadeIn: 0, hold: 100, fadeOut: 0 })];
    expect(sequenceFrame(sequence(steps, { runOrder: SequenceRunOrder.SingleShot }), 50).values).toEqual([
      { channel: 1, value: 50 },
    ]);
    expect(sequenceFrame(sequence(steps, { runOrder: SequenceRunOrder.SingleShot }), 100).values).toEqual([
      { channel: 1, value: 0 },
    ]);
  });
});

describe('sequenceFrame from a start step', () => {
  it('GIVEN a start index WHEN sampled THEN it plays from that step and reports the raw step index', () => {
    const steps = [step(10), step(20), step(30)];
    expect(sequenceFrame(sequence(steps), 0, { index: 1, from: [] })).toEqual({
      values: [{ channel: 1, value: 20 }],
      finished: false,
      index: 1,
    });
    expect(sequenceFrame(sequence(steps), 2000, { index: 1, from: [] }).index).toBe(3);
  });

  it('GIVEN start output WHEN the start step fades in THEN it fades from that output', () => {
    const steps = [step(0), step(100, { fadeIn: 100 })];
    expect(sequenceFrame(sequence(steps), 50, { index: 1, from: [{ channel: 1, value: 50 }] }).values).toEqual([
      { channel: 1, value: 75 },
    ]);
  });

  it('GIVEN a single shot started past its last step WHEN sampled THEN it is finished', () => {
    const steps = [step(10), step(20)];
    expect(
      sequenceFrame(sequence(steps, { runOrder: SequenceRunOrder.SingleShot }), 0, { index: 2, from: [] }).finished,
    ).toBe(true);
  });
});
