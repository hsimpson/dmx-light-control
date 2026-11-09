import { describe, expect, it } from 'vitest';
import { toMeterPercent } from './sound-level-meter';

describe('toMeterPercent', () => {
  it.each([
    ['full scale', 1, 100],
    ['-30 dBFS', 10 ** (-30 / 20), 50],
    ['below the -60 dBFS floor', 10 ** (-80 / 20), 0],
    ['silence', 0, 0],
  ])('GIVEN %s WHEN mapped THEN %s maps to %d%%', (_case, level, percent) => {
    expect(toMeterPercent(level)).toBeCloseTo(percent);
  });
});
