import { describe, expect, it } from 'vitest';
import { linearOrbitDollyScale, orbitPanSpeedForDistance } from './orbit-pan-speed';

describe('orbitPanSpeedForDistance', () => {
  it('keeps default pan speed at a typical viewing distance', () => {
    expect(orbitPanSpeedForDistance(4)).toBeCloseTo(1);
  });

  it('speeds up pan when the camera is close to the target', () => {
    expect(orbitPanSpeedForDistance(0.05)).toBeGreaterThan(orbitPanSpeedForDistance(4));
    expect(orbitPanSpeedForDistance(0.05)).toBeCloseTo(80);
  });

  it('does not slow pan when the camera is far', () => {
    expect(orbitPanSpeedForDistance(20)).toBe(1);
  });
});

describe('linearOrbitDollyScale', () => {
  it('matches multiplicative zoom at the reference distance', () => {
    expect(linearOrbitDollyScale(4, 0.95, 'in', 0.05, 40)).toBeCloseTo(0.95);
  });

  it('moves a constant world step when zooming in close', () => {
    expect(linearOrbitDollyScale(0.4, 0.95, 'in', 0.05, 40)).toBeCloseTo(0.5);
  });

  it('moves a constant world step when zooming out close', () => {
    expect(linearOrbitDollyScale(0.4, 0.95, 'out', 0.05, 40)).toBeCloseTo(1.5);
  });

  it('leaves the radius unchanged when it is not positive', () => {
    expect(linearOrbitDollyScale(0, 0.95, 'in', 0.05, 40)).toBe(1);
    expect(linearOrbitDollyScale(-1, 0.95, 'out', 0.05, 40)).toBe(1);
  });
});
