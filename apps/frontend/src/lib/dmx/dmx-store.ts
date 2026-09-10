'use client';

import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

export const DMX_CHANNEL_COUNT = 512;

export type DmxConnectionStatus = 'idle' | 'connecting' | 'open' | 'error';

export type DmxChannelUpdate = {
  channel: number;
  value: number;
};

export type DmxStoreState = {
  channels: number[];
  status: DmxConnectionStatus;
  applySnapshot: (values: ArrayLike<number>) => void;
  applyDelta: (updates: DmxChannelUpdate[]) => void;
  setStatus: (status: DmxConnectionStatus) => void;
};

function createZeroChannels(): number[] {
  return Array.from({ length: DMX_CHANNEL_COUNT }, () => 0);
}

function isValidDmxValue(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 255;
}

export function createDmxStore() {
  return createStore<DmxStoreState>(set => ({
    channels: createZeroChannels(),
    status: 'idle',
    applySnapshot: values => {
      const next = createZeroChannels();
      const length = Math.min(DMX_CHANNEL_COUNT, values.length);
      for (let index = 0; index < length; index += 1) {
        const value = values[index];
        if (typeof value === 'number' && isValidDmxValue(value)) {
          next[index] = value;
        }
      }
      set({ channels: next });
    },
    applyDelta: updates => {
      set(state => {
        let changed = false;
        const next = state.channels.slice();
        for (const { channel, value } of updates) {
          if (!Number.isInteger(channel) || channel < 1 || channel > DMX_CHANNEL_COUNT) {
            continue;
          }
          if (!isValidDmxValue(value)) {
            continue;
          }
          const index = channel - 1;
          if (next[index] !== value) {
            next[index] = value;
            changed = true;
          }
        }
        return changed ? { channels: next } : state;
      });
    },
    setStatus: status => {
      set({ status });
    },
  }));
}

export const dmxStore = createDmxStore();

export function useDmxStore<T>(selector: (state: DmxStoreState) => T): T {
  return useStore(dmxStore, selector);
}

export function resetDmxStore(): void {
  dmxStore.setState({
    channels: createZeroChannels(),
    status: 'idle',
  });
}
