import type { FixtureChannelPreset } from '@/shared/types/graphql/graphql';

export type SequenceFixtureChannel = {
  publicId: string;
  startAddress: number;
  name: string;
  channels: { channelNumber: number; name: string; preset?: FixtureChannelPreset }[];
};

export const absoluteDmxChannel = (startAddress: number, channelNumber: number): number =>
  startAddress + channelNumber - 1;

export const sortedSequenceFixtures = (fixtures: SequenceFixtureChannel[]): SequenceFixtureChannel[] =>
  [...fixtures].sort(
    (left, right) => left.startAddress - right.startAddress || left.publicId.localeCompare(right.publicId),
  );

export const fixtureAbsoluteChannels = (fixture: SequenceFixtureChannel): number[] =>
  fixture.channels.map(channel => absoluteDmxChannel(fixture.startAddress, channel.channelNumber));

export type SequenceDmxDraft = {
  key: string;
  channel: number;
  value: number;
};

export type SequenceStepDraft = {
  key: string;
  fadeIn: number;
  hold: number;
  fadeOut: number;
  dmxValues: SequenceDmxDraft[];
};

export const newSequenceDmxValue = (channel = 1, value = 0): SequenceDmxDraft => ({
  key: crypto.randomUUID(),
  channel,
  value,
});

export const emptySequenceStep = (): SequenceStepDraft => ({
  key: crypto.randomUUID(),
  fadeIn: 0,
  hold: 0,
  fadeOut: 0,
  dmxValues: [],
});

export const removeChannelValues = (steps: SequenceStepDraft[], channels: ReadonlySet<number>): SequenceStepDraft[] =>
  steps.map(step => ({ ...step, dmxValues: step.dmxValues.filter(entry => !channels.has(entry.channel)) }));

export const moveSequenceStep = (
  steps: SequenceStepDraft[],
  fromIndex: number,
  toIndex: number,
): SequenceStepDraft[] => {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= steps.length || toIndex >= steps.length) {
    return steps;
  }
  const next = [...steps];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) {
    return steps;
  }
  next.splice(toIndex, 0, moved);
  return next;
};
