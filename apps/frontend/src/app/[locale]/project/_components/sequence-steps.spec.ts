import { describe, expect, it } from 'vitest';
import { absoluteDmxChannel, moveSequenceStep, type SequenceStepDraft } from './sequence-steps';

const step = (id: number, channel?: number): SequenceStepDraft => ({
  key: `step-${id}`,
  fadeIn: id,
  hold: 0,
  fadeOut: 0,
  dmxValues: channel === undefined ? [] : [{ key: `dmx-${id}`, channel, value: 255 }],
});

describe('sequence steps', () => {
  it('keeps each step channel with that step when the array is reordered', () => {
    const moved = moveSequenceStep([step(0, 1), step(1, 10), step(2, 11)], 0, 2);
    expect(moved.map(item => item.key)).toEqual(['step-1', 'step-2', 'step-0']);
    expect(moved.map(item => item.dmxValues[0]?.channel)).toEqual([10, 11, 1]);
  });

  it('maps a fixture channel onto its absolute DMX address', () => {
    expect(absoluteDmxChannel(10, 2)).toBe(11);
  });

  it('leaves the array unchanged when the indexes are not a move', () => {
    const steps = [step(0), step(1)];
    expect(moveSequenceStep(steps, 0, 0)).toBe(steps);
    expect(moveSequenceStep(steps, -1, 0)).toBe(steps);
    expect(moveSequenceStep(steps, 0, -1)).toBe(steps);
    expect(moveSequenceStep(steps, 2, 0)).toBe(steps);
    expect(moveSequenceStep(steps, 0, 2)).toBe(steps);
  });
});
