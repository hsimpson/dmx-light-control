import { GetFixturesQuery } from './graphql/graphql';

export type Fixture = GetFixturesQuery['fixtures'][number];

export type FixtureVendor = GetFixturesQuery['fixtures'][number]['fixtureVendor'];

export type FixtureChannelDefinition = GetFixturesQuery['fixtures'][number]['fixtureChannelDefinitions'][number];

export type FixtureChannelRange =
  GetFixturesQuery['fixtures'][number]['fixtureChannelDefinitions'][number]['fixtureChannelRanges'][number];

export type FixtureChannelMode = GetFixturesQuery['fixtures'][number]['fixtureChannelModes'][number];
