import type { DmxChannelUpdate } from '@/lib/dmx/dmx-store';
import type { SequenceStepDraft } from './sequence-steps';

export const stepChannels = (steps: SequenceStepDraft[]): number[] =>
  [...new Set(steps.flatMap(step => step.dmxValues.map(entry => entry.channel)))].sort((left, right) => left - right);

export const snapshotChannels = (
  universe: readonly number[],
  channels: readonly number[],
  restore: ReadonlyMap<number, number>,
): Map<number, number> => {
  const next = new Map(restore);
  for (const channel of channels) {
    if (!next.has(channel)) {
      next.set(channel, universe[channel - 1] ?? 0);
    }
  }
  return new Map([...next].sort(([left], [right]) => left - right));
};

export const liveOutput = (step: SequenceStepDraft, restore: ReadonlyMap<number, number>): DmxChannelUpdate[] =>
  [...restore].map(([channel, value]) => ({
    channel,
    value: step.dmxValues.find(entry => entry.channel === channel)?.value ?? value,
  }));

export const restoreOutput = (restore: ReadonlyMap<number, number>): DmxChannelUpdate[] =>
  [...restore].map(([channel, value]) => ({ channel, value }));
