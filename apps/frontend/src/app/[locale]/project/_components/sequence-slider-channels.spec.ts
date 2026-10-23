import { FixtureChannelPreset } from '@/shared/types/graphql/graphql';
import { describe, expect, it } from 'vitest';

import { sequenceChannelValue, sequenceSliderGroups } from './sequence-slider-channels';
import type { SequenceFixtureChannel, SequenceStepDraft } from './sequence-steps';

const fixtures: SequenceFixtureChannel[] = [
  {
    publicId: 'wash',
    startAddress: 5,
    name: 'Wash',
    channels: [
      { channelNumber: 2, name: 'Green', preset: FixtureChannelPreset.IntensityGreen },
      { channelNumber: 1, name: 'Red', preset: FixtureChannelPreset.IntensityRed },
    ],
  },
  { publicId: 'par', startAddress: 1, name: 'PAR', channels: [{ channelNumber: 1, name: 'Dimmer' }] },
];

describe('sequenceSliderGroups', () => {
  it('groups channels under each fixture, ordered by DMX address', () => {
    expect(sequenceSliderGroups(fixtures).map(group => group.label)).toEqual(['PAR [1]', 'Wash [2]']);
    expect(sequenceSliderGroups(fixtures).flatMap(group => group.channels.map(channel => channel.channel))).toEqual([
      1, 5, 6,
    ]);
    expect(sequenceSliderGroups(fixtures).flatMap(group => group.channels.map(channel => channel.name))).toEqual([
      'Dimmer',
      'Red',
      'Green',
    ]);
    expect(sequenceSliderGroups(fixtures).flatMap(group => group.channels.map(channel => channel.preset))).toEqual([
      undefined,
      FixtureChannelPreset.IntensityRed,
      FixtureChannelPreset.IntensityGreen,
    ]);
  });

  it('reads the selected step value and uses 0 when the step omits the channel', () => {
    const step: SequenceStepDraft = {
      key: 's',
      fadeIn: 0,
      hold: 0,
      fadeOut: 0,
      dmxValues: [{ key: 'd', channel: 5, value: 40 }],
    };
    expect(sequenceChannelValue(step, 5)).toBe(40);
    expect(sequenceChannelValue(step, 1)).toBe(0);
    expect(sequenceChannelValue(undefined, 1)).toBe(0);
  });
});
