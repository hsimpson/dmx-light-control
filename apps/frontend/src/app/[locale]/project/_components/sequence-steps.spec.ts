import { describe, expect, it } from 'vitest';
import { moveSequenceStep, renumberSequenceSteps, type SequenceStepDraft } from './sequence-steps';

const step = (order: number): SequenceStepDraft => ({
  order,
  fadeIn: order,
  hold: 0,
  fadeOut: 0,
  dmxValues: [],
});

describe('sequence steps', () => {
  it('renumbers order after a move', () => {
    const moved = moveSequenceStep([step(0), step(1), step(2)], 0, 2);
    expect(moved.map(item => item.fadeIn)).toEqual([1, 2, 0]);
    expect(renumberSequenceSteps(moved).map(item => item.order)).toEqual([0, 1, 2]);
  });
});
