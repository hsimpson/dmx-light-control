import { channelAssignment } from '@/db/schema';
import { FixtureChannelPreset } from '@/fixtures/channel-presets';
import { InferInsertModel } from 'drizzle-orm';

export const channelAssignments: InferInsertModel<typeof channelAssignment>[] =
  [
    {
      externalId: 'aadb2d60-4a8e-45c3-b58a-8726861930b3',
      fixtureId: 1,
      channelMode: 4,
      channelNumber: 1,
      preset: FixtureChannelPreset.IntensityRed,
    },
    {
      externalId: 'f662fcc2-9db3-4413-b8fd-ffce43d1c234',
      fixtureId: 1,
      channelMode: 4,
      channelNumber: 2,
      preset: FixtureChannelPreset.IntensityGreen,
    },
    {
      externalId: '3cb78793-bd37-4833-ba42-c482cd9ebe39',
      fixtureId: 1,
      channelMode: 4,
      channelNumber: 3,
      preset: FixtureChannelPreset.IntensityBlue,
    },
    {
      externalId: '2c9616d2-105a-41cd-b627-8710cecb46bf',
      fixtureId: 1,
      channelMode: 4,
      channelNumber: 4,
      preset: FixtureChannelPreset.IntensityUV,
    },
    {
      externalId: 'fb556f0f-0612-4d99-917d-ce0c8f96fbe1',
      fixtureId: 1,
      channelMode: 5,
      channelNumber: 1,
      preset: FixtureChannelPreset.IntensityRed,
    },
    {
      externalId: '02464bc7-2394-48a8-82a9-8254eff799e1',
      fixtureId: 1,
      channelMode: 5,
      channelNumber: 2,
      preset: FixtureChannelPreset.IntensityGreen,
    },
    {
      externalId: '8007e20d-6cbc-4597-b766-66221c1328b4',
      fixtureId: 1,
      channelMode: 5,
      channelNumber: 3,
      preset: FixtureChannelPreset.IntensityBlue,
    },
    {
      externalId: 'a4960738-66c7-4ce1-b76c-752794fa35c9',
      fixtureId: 1,
      channelMode: 5,
      channelNumber: 4,
      preset: FixtureChannelPreset.IntensityUV,
    },
    {
      externalId: 'bd84e54c-5c44-468d-9156-6bdb3faf4e65',
      fixtureId: 1,
      channelMode: 5,
      channelNumber: 5,
      preset: FixtureChannelPreset.IntensityMasterDimmer,
    },
    {
      externalId: '083c4a50-f865-438c-b165-6e6050fe0e59',
      fixtureId: 1,
      channelMode: 6,
      channelNumber: 1,
      preset: FixtureChannelPreset.IntensityRed,
    },
    {
      externalId: '12df0d5b-72a0-490c-92bf-38cc100fb8a7',
      fixtureId: 1,
      channelMode: 6,
      channelNumber: 2,
      preset: FixtureChannelPreset.IntensityGreen,
    },
    {
      externalId: 'd3aa9a8d-96b6-4db6-8c30-f332ccd436d8',
      fixtureId: 1,
      channelMode: 6,
      channelNumber: 3,
      preset: FixtureChannelPreset.IntensityBlue,
    },
    {
      externalId: '7ef447b9-275d-4f91-b4db-29b5706a154e',
      fixtureId: 1,
      channelMode: 6,
      channelNumber: 4,
      preset: FixtureChannelPreset.IntensityUV,
    },
    {
      externalId: 'd82fc2d7-f084-4782-92b9-3fe1eafb1aaa',
      fixtureId: 1,
      channelMode: 6,
      channelNumber: 5,
      preset: FixtureChannelPreset.ShutterStrobeSlowFast,
    },
    {
      externalId: 'af6e8c36-4b70-4fab-aded-790fe06e00bd',
      fixtureId: 1,
      channelMode: 6,
      channelNumber: 6,
      preset: FixtureChannelPreset.IntensityMasterDimmer,
    },
  ];
