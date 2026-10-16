import { describe, expect, it } from 'vitest';
import { appendCapturedStep, mergeCapturedIntoStep } from './sequence-capture';
import type { SequenceStepDraft } from './sequence-steps';

const base: SequenceStepDraft = {
  key: 'a',
  fadeIn: 100,
  hold: 200,
  fadeOut: 300,
  dmxValues: [{ key: 'a1', channel: 1, value: 10 }],
};

describe('sequence capture helpers', () => {
  it('appends a step with captured values and copied timing', () => {
    const next = appendCapturedStep([base], [{ channel: 2, value: 50 }], base);
    expect(next).toHaveLength(2);
    expect(next[1]).toMatchObject({ fadeIn: 100, hold: 200, fadeOut: 300, dmxValues: [{ channel: 2, value: 50 }] });
    expect(appendCapturedStep([], [], undefined)[0]).toMatchObject({ fadeIn: 0, hold: 0, fadeOut: 0 });
  });

  it('merges captured values into an existing step', () => {
    const next = mergeCapturedIntoStep([base], 0, [
      { channel: 1, value: 99 },
      { channel: 3, value: 7 },
    ]);
    expect(next[0]?.dmxValues.map(entry => [entry.channel, entry.value])).toEqual([
      [1, 99],
      [3, 7],
    ]);
  });
});
