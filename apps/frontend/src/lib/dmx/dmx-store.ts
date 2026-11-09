'use client';

import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

export const DMX_CHANNEL_COUNT = 512;

export type DmxConnectionStatus = 'idle' | 'connecting' | 'open' | 'error';

export type DmxChannelUpdate = {
  channel: number;
  value: number;
};

export type MidiInput = {
  portName: string;
  message: number[];
};

export type DmxStoreState = {
  channels: number[];
  status: DmxConnectionStatus;
  runningFunctionIds: string[];
  /** Virtual console button/slider values, owned by the backend. */
  controlValues: Record<string, number>;
  lastMidiInput: MidiInput | null;
  /** Per-channel peak (0..1) of the project's sound input, null until the backend sends one. */
  soundLevels: number[] | null;
  /** Smoothed bar levels (0..1, volume first) per enabled audio triggers control. */
  audioLevels: Record<string, number[]>;
  /** Beats per minute per enabled audio triggers control while the backend knows one. */
  audioBpm: Record<string, number>;
  applySnapshot: (values: ArrayLike<number>) => void;
  applyDelta: (updates: DmxChannelUpdate[]) => void;
  setStatus: (status: DmxConnectionStatus) => void;
  setRunningFunctionIds: (ids: string[]) => void;
  setControlValues: (values: Record<string, number>) => void;
  setLastMidiInput: (input: MidiInput) => void;
  setSoundLevels: (levels: number[]) => void;
  setAudioLevels: (levels: Record<string, number[]>) => void;
  setAudioBpm: (bpm: Record<string, number>) => void;
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
    runningFunctionIds: [],
    controlValues: {},
    lastMidiInput: null,
    soundLevels: null,
    audioLevels: {},
    audioBpm: {},
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
    setRunningFunctionIds: runningFunctionIds => {
      set({ runningFunctionIds });
    },
    setControlValues: controlValues => {
      set({ controlValues });
    },
    setLastMidiInput: lastMidiInput => {
      set({ lastMidiInput });
    },
    setSoundLevels: soundLevels => {
      set({ soundLevels });
    },
    setAudioLevels: audioLevels => {
      set({ audioLevels });
    },
    setAudioBpm: audioBpm => {
      set({ audioBpm });
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
    runningFunctionIds: [],
    controlValues: {},
    lastMidiInput: null,
    soundLevels: null,
    audioLevels: {},
    audioBpm: {},
    status: 'idle',
  });
}
