import { describe, expect, it } from 'vitest';
import { createDmxStore, DMX_CHANNEL_COUNT } from './dmx-store';

describe('createDmxStore', () => {
  it('starts with 512 zeros and idle status', () => {
    const store = createDmxStore();
    const { channels, status } = store.getState();

    expect(status).toBe('idle');
    expect(channels).toHaveLength(DMX_CHANNEL_COUNT);
    expect(channels.every(value => value === 0)).toBe(true);
  });

  it('applySnapshot replaces all channels', () => {
    const store = createDmxStore();
    const snapshot = Array.from({ length: DMX_CHANNEL_COUNT }, (_, index) => (index === 4 ? 200 : 0));

    store.getState().applySnapshot(snapshot);

    expect(store.getState().channels[4]).toBe(200);
    expect(store.getState().channels[0]).toBe(0);
    expect(store.getState().channels).toHaveLength(DMX_CHANNEL_COUNT);
  });

  it('applySnapshot discards previous session values', () => {
    const store = createDmxStore();
    store.getState().applyDelta([{ channel: 1, value: 255 }]);
    store.getState().applySnapshot(Array.from({ length: DMX_CHANNEL_COUNT }, () => 0));

    expect(store.getState().channels[0]).toBe(0);
  });

  it('applyDelta patches a 1-based channel', () => {
    const store = createDmxStore();
    store.getState().applyDelta([{ channel: 5, value: 128 }]);

    expect(store.getState().channels[4]).toBe(128);
  });

  it('applyDelta ignores invalid channel and value', () => {
    const store = createDmxStore();
    store.getState().applyDelta([
      { channel: 0, value: 10 },
      { channel: 513, value: 10 },
      { channel: 1, value: -1 },
      { channel: 1, value: 256 },
    ]);

    expect(store.getState().channels.every(value => value === 0)).toBe(true);
  });

  it('setStatus updates connection status', () => {
    const store = createDmxStore();
    store.getState().setStatus('connecting');
    expect(store.getState().status).toBe('connecting');
    store.getState().setStatus('open');
    expect(store.getState().status).toBe('open');
    store.getState().setStatus('error');
    expect(store.getState().status).toBe('error');
  });
});
