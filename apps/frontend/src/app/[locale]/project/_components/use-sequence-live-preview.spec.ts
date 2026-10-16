import { dmxStore, resetDmxStore } from '@/lib/dmx/dmx-store';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SequenceStepDraft } from './sequence-steps';
import { useSequenceLivePreview } from './use-sequence-live-preview';

const setChannels = vi.hoisted(() => vi.fn());

vi.mock('@/lib/dmx/dmx-socket-connector', () => ({
  getDmxWebsocketClient: () => ({ setChannels }),
}));

const step = (channel: number, value: number): SequenceStepDraft => ({
  key: `s${channel}`,
  fadeIn: 0,
  hold: 0,
  fadeOut: 0,
  dmxValues: [{ key: `d${channel}`, channel, value }],
});

const steps = [step(1, 255), step(2, 128)];

describe('useSequenceLivePreview', () => {
  beforeEach(() => {
    setChannels.mockClear();
    resetDmxStore();
    dmxStore.getState().applySnapshot([10, 20]);
    dmxStore.getState().setStatus('open');
  });

  it('sends the selected step and restores when switched off', () => {
    const { result, rerender } = renderHook(({ selected }) => useSequenceLivePreview(steps, selected, vi.fn()), {
      initialProps: { selected: 0 },
    });
    act(() => {
      result.current.setLive(true);
    });
    expect(result.current.live).toBe(true);
    expect(setChannels).toHaveBeenLastCalledWith([
      { channel: 1, value: 255 },
      { channel: 2, value: 20 },
    ]);
    rerender({ selected: 1 });
    expect(setChannels).toHaveBeenLastCalledWith([
      { channel: 1, value: 10 },
      { channel: 2, value: 128 },
    ]);
    act(() => {
      result.current.setLive(false);
    });
    expect(setChannels).toHaveBeenLastCalledWith([
      { channel: 1, value: 10 },
      { channel: 2, value: 20 },
    ]);
    expect(result.current.sentValues.current.get(2)).toBe(20);
  });

  it('restores on unmount', () => {
    const { result, unmount } = renderHook(() => useSequenceLivePreview(steps, 0, vi.fn()));
    act(() => {
      result.current.setLive(true);
    });
    unmount();
    expect(setChannels).toHaveBeenLastCalledWith([
      { channel: 1, value: 10 },
      { channel: 2, value: 20 },
    ]);
  });

  it('switches off and reports when the socket disconnects', () => {
    const onDisconnected = vi.fn();
    const { result } = renderHook(() => useSequenceLivePreview(steps, 0, onDisconnected));
    act(() => {
      result.current.setLive(true);
    });
    act(() => {
      dmxStore.getState().setStatus('connecting');
    });
    expect(onDisconnected).toHaveBeenCalledTimes(1);
    expect(result.current.live).toBe(false);
    expect(result.current.canGoLive).toBe(false);
    expect(setChannels).toHaveBeenLastCalledWith([
      { channel: 1, value: 10 },
      { channel: 2, value: 20 },
    ]);
  });
});
