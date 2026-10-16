'use client';

import { dmxStore, type DmxChannelUpdate } from '@/lib/dmx/dmx-store';
import { useEffect, useState, type RefObject } from 'react';

export type SequenceCapture = {
  touchedCount: number;
  capturedValues: () => DmxChannelUpdate[];
  clear: () => void;
};

export const useSequenceCapture = (
  patchedChannels: ReadonlySet<number>,
  sentValues: RefObject<Map<number, number>>,
): SequenceCapture => {
  const [touched, setTouched] = useState<ReadonlySet<number>>(() => new Set());

  useEffect(
    () =>
      dmxStore.subscribe((state, previous) => {
        if (state.channels === previous.channels) {
          return;
        }
        const changed = state.channels.flatMap((value, index) => {
          const channel = index + 1;
          return value !== previous.channels[index] &&
            patchedChannels.has(channel) &&
            sentValues.current.get(channel) !== value
            ? [channel]
            : [];
        });
        if (changed.length > 0) {
          setTouched(current => new Set([...current, ...changed]));
        }
      }),
    [patchedChannels, sentValues],
  );

  return {
    touchedCount: touched.size,
    capturedValues: () => {
      const { channels } = dmxStore.getState();
      return [...touched]
        .sort((left, right) => left - right)
        .map(channel => ({ channel, value: channels[channel - 1] ?? 0 }));
    },
    clear: () => {
      setTouched(new Set());
    },
  };
};
