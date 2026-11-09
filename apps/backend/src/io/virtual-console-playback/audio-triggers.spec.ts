import { describe, expect, it } from 'vitest';
import { barLevels, nextFunctionState, thresholdDmx } from './audio-triggers';

const bar = { mode: 'channels' as const, minThreshold: 20, maxThreshold: 80 };

describe('thresholdDmx', () => {
  it.each([
    [0, 0],
    [0.2, 0],
    [0.5, 128],
    [0.8, 255],
    [1, 255],
  ])('GIVEN level %d WHEN mapped between 20 %% and 80 %% THEN it outputs %d', (level, dmx) => {
    expect(thresholdDmx(level, bar)).toBe(dmx);
  });
});

describe('nextFunctionState', () => {
  it('GIVEN an inactive bar WHEN the level reaches the max THEN it switches on, not before', () => {
    expect(nextFunctionState(0.79, bar, false)).toBe(false);
    expect(nextFunctionState(0.8, bar, false)).toBe(true);
  });

  it('GIVEN an active bar WHEN the level falls between the thresholds THEN it stays on until below the min', () => {
    expect(nextFunctionState(0.5, bar, true)).toBe(true);
    expect(nextFunctionState(0.19, bar, true)).toBe(false);
  });
});

describe('barLevels', () => {
  it('GIVEN a control with two bands WHEN a silent frame is read THEN volume plus two band levels are 0', () => {
    expect(barLevels({ bandCount: 2 }, { power: [], sampleRate: 48000, meanSquare: 0 })).toEqual([0, 0, 0]);
  });
});
