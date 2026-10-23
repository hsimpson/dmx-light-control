'use client';

import { getDmxWebsocketClient } from '@/lib/dmx/dmx-socket-connector';
import { dmxStore, useDmxStore, type DmxChannelUpdate } from '@/lib/dmx/dmx-store';
import { useEffect, useEffectEvent, useRef, useState, type RefObject } from 'react';
import { liveOutput, restoreOutput, snapshotChannels, stepChannels } from './sequence-live-preview';
import type { SequenceStepDraft } from './sequence-steps';
import { resetVirtualConsoleChannelOutput } from './virtual-console-channel-output';

export type SequenceLivePreview = {
  live: boolean;
  canGoLive: boolean;
  setLive: (live: boolean) => void;
  sentValues: RefObject<Map<number, number>>;
};

const sendTracked = (sent: Map<number, number>, updates: DmxChannelUpdate[]) => {
  if (updates.length === 0) {
    return;
  }
  for (const update of updates) {
    sent.set(update.channel, update.value);
  }
  getDmxWebsocketClient()?.setChannels(updates);
};

export const useSequenceLivePreview = (
  steps: SequenceStepDraft[],
  selectedStep: number | undefined,
  zeroChannels: readonly number[],
  onDisconnected: () => void,
): SequenceLivePreview => {
  const [enabled, setEnabled] = useState(false);
  const open = useDmxStore(state => state.status === 'open');
  const restoreRef = useRef(new Map<number, number>());
  const sentRef = useRef(new Map<number, number>());
  const enteredLiveRef = useRef(false);
  const notifyDisconnected = useEffectEvent(onDisconnected);
  const step = selectedStep === undefined ? undefined : steps[selectedStep];
  const live = enabled && open && step !== undefined;

  useEffect(() => {
    if (!live) {
      enteredLiveRef.current = false;
      return;
    }
    if (!enteredLiveRef.current) {
      resetVirtualConsoleChannelOutput();
      enteredLiveRef.current = true;
    }
    const channels = [...new Set([...stepChannels(steps), ...zeroChannels])].sort((left, right) => left - right);
    restoreRef.current = snapshotChannels(dmxStore.getState().channels, channels, restoreRef.current);
    sendTracked(sentRef.current, liveOutput(step, restoreRef.current, new Set(zeroChannels)));
  }, [live, step, steps, zeroChannels]);

  useEffect(() => {
    if (live || restoreRef.current.size === 0) {
      return;
    }
    sendTracked(sentRef.current, restoreOutput(restoreRef.current));
    restoreRef.current = new Map();
  }, [live]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    return dmxStore.subscribe((state, previous) => {
      if (previous.status === 'open' && state.status !== 'open') {
        setEnabled(false);
        notifyDisconnected();
      }
    });
  }, [enabled]);

  useEffect(() => {
    const restore = restoreRef;
    const sent = sentRef;
    return () => {
      if (restore.current.size === 0) {
        return;
      }
      sendTracked(sent.current, restoreOutput(restore.current));
      restore.current = new Map();
    };
  }, []);

  return { live, canGoLive: open && step !== undefined, setLive: setEnabled, sentValues: sentRef };
};
