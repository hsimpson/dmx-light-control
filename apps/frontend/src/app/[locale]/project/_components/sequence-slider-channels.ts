import type { FixtureChannelPreset } from '@/shared/types/graphql/graphql';

import {
  absoluteDmxChannel,
  sortedSequenceFixtures,
  type SequenceFixtureChannel,
  type SequenceStepDraft,
} from './sequence-steps';

export type SequenceSliderChannel = {
  channel: number;
  name: string;
  preset?: FixtureChannelPreset;
};

export type SequenceSliderGroup = {
  publicId: string;
  label: string;
  channels: SequenceSliderChannel[];
};

const fixtureLabel = (fixture: SequenceFixtureChannel, fixtureNumber: number): string =>
  `${fixture.name} [${fixtureNumber}]`;

export const sequenceSliderGroups = (fixtures: readonly SequenceFixtureChannel[]): SequenceSliderGroup[] => {
  const seen = new Set<number>();
  const groups: SequenceSliderGroup[] = [];
  for (const [index, fixture] of sortedSequenceFixtures([...fixtures]).entries()) {
    const channels = [...fixture.channels]
      .sort((left, right) => left.channelNumber - right.channelNumber)
      .flatMap(channel => {
        const absolute = absoluteDmxChannel(fixture.startAddress, channel.channelNumber);
        if (seen.has(absolute)) {
          return [];
        }
        seen.add(absolute);
        return [
          {
            channel: absolute,
            name: channel.name,
            ...(channel.preset === undefined ? {} : { preset: channel.preset }),
          },
        ];
      });
    if (channels.length === 0) {
      continue;
    }
    groups.push({ publicId: fixture.publicId, label: fixtureLabel(fixture, index + 1), channels });
  }
  return groups;
};

export const sequenceChannelValue = (step: SequenceStepDraft | undefined, channel: number): number =>
  step?.dmxValues.find(entry => entry.channel === channel)?.value ?? 0;
