import { dmxStore, resetDmxStore } from '@/lib/dmx/dmx-store';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSequenceCapture } from './use-sequence-capture';

const patched = new Set([1, 2]);

describe('useSequenceCapture', () => {
  beforeEach(() => {
    resetDmxStore();
  });

  it('records patched channels changed by others and ignores own sends', () => {
    const sent = { current: new Map([[2, 50]]) };
    const { result } = renderHook(() => useSequenceCapture(patched, sent));
    act(() => {
      dmxStore.getState().applyDelta([
        { channel: 1, value: 100 },
        { channel: 2, value: 50 },
        { channel: 3, value: 9 },
      ]);
    });
    expect(result.current.touchedCount).toBe(1);
    expect(result.current.capturedValues()).toEqual([{ channel: 1, value: 100 }]);
    act(() => {
      result.current.clear();
    });
    expect(result.current.touchedCount).toBe(0);
  });
});
