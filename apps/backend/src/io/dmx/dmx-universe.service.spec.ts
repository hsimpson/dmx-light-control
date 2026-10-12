import { describe, expect, it } from 'vitest';
import { DmxUniverseService } from './dmx-universe.service';

describe('DmxUniverseService', () => {
  it('starts with a 512-channel snapshot of zeros', () => {
    const universe = new DmxUniverseService();
    const snapshot = universe.snapshot();

    expect(snapshot).toHaveLength(512);
    expect(snapshot.every(value => value === 0)).toBe(true);
    expect(universe.getFrame()[0]).toBe(0);
  });

  it('apply returns only valid entries and updates the frame', () => {
    const universe = new DmxUniverseService();
    const applied = universe.apply([
      { channel: 0, value: 10 },
      { channel: 5, value: 128 },
      { channel: 1, value: 256 },
      { channel: 513, value: 1 },
    ]);

    expect(applied).toEqual([{ channel: 5, value: 128 }]);
    expect(universe.snapshot()[4]).toBe(128);
    expect(universe.getFrame()[5]).toBe(128);
  });

  it('merges layers with highest-takes-precedence and restores the manual level when a layer is cleared', () => {
    const universe = new DmxUniverseService();
    universe.apply([{ channel: 1, value: 40 }]);
    universe.setLayer('fn', [
      { channel: 1, value: 200 },
      { channel: 2, value: 10 },
    ]);
    expect(universe.snapshot()[0]).toBe(200);
    expect(universe.snapshot()[1]).toBe(10);

    const cleared = universe.clearLayer('fn');
    expect(universe.snapshot()[0]).toBe(40);
    expect(universe.snapshot()[1]).toBe(0);
    expect(cleared).toEqual([
      { channel: 1, value: 40 },
      { channel: 2, value: 0 },
    ]);
  });
});
