import { fixtureChannelDefinition } from '@/db/schema';
import { FixtureChannelPreset } from '@/fixtures/channel-presets';
import { InferInsertModel } from 'drizzle-orm';

export const fixtureChannelDefinitions: InferInsertModel<typeof fixtureChannelDefinition>[] = [
  {
    publicId: 'aa597568-bbec-48c1-958b-6e383be5dc2d',
    fixtureId: 1,
    name: 'Red',
    order: 0,
    preset: FixtureChannelPreset.IntensityRed,
  },
  {
    publicId: 'fc331fb3-5021-4ef6-90d4-dc3ce21d335c',
    fixtureId: 1,
    name: 'Green',
    order: 1,
    preset: FixtureChannelPreset.IntensityGreen,
  },
  {
    publicId: '230a37d9-e195-4432-8ff9-6663f1eb45a7',
    fixtureId: 1,
    name: 'Blue',
    order: 2,
    preset: FixtureChannelPreset.IntensityBlue,
  },
  {
    publicId: 'ece1055d-8cdc-468b-9040-60e252e344de',
    fixtureId: 1,
    name: 'UV',
    order: 3,
    preset: FixtureChannelPreset.IntensityUV,
  },
  {
    publicId: 'f2cbacc6-2244-4b52-83cc-5a517a513e95',
    fixtureId: 1,
    name: 'Shutter/strobe',
    order: 4,
    preset: FixtureChannelPreset.ShutterStrobeSlowFast,
  },
  {
    publicId: 'abf72951-7fb7-47e8-a923-9f7f8d097119',
    fixtureId: 1,
    name: 'Master dimmer',
    order: 5,
    preset: FixtureChannelPreset.IntensityMasterDimmer,
  },
  {
    publicId: '2f598d6b-1b0e-462c-9c8f-9b368c4e689f',
    fixtureId: 1,
    name: 'Program Selection Mode',
    order: 6,
    preset: FixtureChannelPreset.Custom,
  },
  {
    publicId: 'a340e94c-de49-4a08-97ce-c3a4225a63a4',
    fixtureId: 1,
    name: 'Color macros/programs/sound activity',
    order: 7,
    preset: FixtureChannelPreset.Custom,
  },
  {
    publicId: '7d0f3a8c-7c6e-4054-ba2d-b747f96a58ba',
    fixtureId: 1,
    name: 'Program speed/sound sensitive',
    order: 8,
    preset: FixtureChannelPreset.Custom,
  },
  {
    publicId: '4ce86726-832b-424e-b7c0-ddd75fd98fcc',
    fixtureId: 1,
    name: 'Dimmer curves',
    order: 9,
    preset: FixtureChannelPreset.Custom,
  },
];
