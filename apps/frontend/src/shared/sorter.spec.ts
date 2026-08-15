import { describe, expect, it } from 'vitest';
import { dmxRangeSorter, orderSorter } from './sorter';

describe('orderSorter', () => {
  it('orders by order ascending', () => {
    const items = [{ order: 2 }, { order: 0 }, { order: 1 }];
    expect([...items].sort(orderSorter).map(i => i.order)).toEqual([0, 1, 2]);
  });
});

describe('dmxRangeSorter', () => {
  it('orders by dmxStart ascending', () => {
    const ranges = [
      { dmxStart: 50, dmxEnd: 51 },
      { dmxStart: 0, dmxEnd: 200 },
      { dmxStart: 10, dmxEnd: 19 },
    ];
    expect([...ranges].sort(dmxRangeSorter).map(r => r.dmxStart)).toEqual([0, 10, 50]);
  });
});
