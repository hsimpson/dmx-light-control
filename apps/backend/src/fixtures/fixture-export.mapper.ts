import { FixtureChannelPreset } from './channel-presets';

export const FIXTURE_EXPORT_SCHEMA_VERSION = 1;

export type FixtureExportRange = {
  publicId: string;
  dmxStart: number;
  dmxEnd: number;
  description: string;
};

export type FixtureExportDefinition = {
  publicId: string;
  name: string;
  order: number;
  preset: FixtureChannelPreset;
  ranges: FixtureExportRange[];
};

export type FixtureExportAssignment = {
  channelNumber: number;
  channelDefinitionPublicId: string;
};

export type FixtureExportMode = {
  publicId: string;
  name: string;
  order: number;
  assignments: FixtureExportAssignment[];
};

export type FixtureExportVendor = {
  publicId: string;
  name: string;
};

export type FixtureExportFixture = {
  publicId: string;
  name: string;
  vendor: FixtureExportVendor;
  channelDefinitions: FixtureExportDefinition[];
  channelModes: FixtureExportMode[];
};

export type FixtureExportDocument = {
  schemaVersion: number;
  vendors: FixtureExportVendor[];
  fixtures: FixtureExportFixture[];
};

type RangeRow = {
  publicId: string | null;
  dmxStart: number;
  dmxEnd: number;
  description: string;
};

type DefinitionRow = {
  publicId: string | null;
  name: string;
  order: number;
  preset: FixtureChannelPreset;
  fixtureChannelRanges?: RangeRow[];
};

type AssignmentRow = {
  channelNumber: number;
  fixtureChannelDefinition?: { publicId: string | null } | null;
};

type ModeRow = {
  publicId: string | null;
  name: string;
  order: number;
  fixtureChannelAssignments?: AssignmentRow[];
};

export type FixtureExportSource = {
  publicId: string | null;
  name: string;
  fixtureVendor?: { publicId: string | null; name: string } | null;
  fixtureChannelDefinitions?: DefinitionRow[];
  fixtureChannelModes?: ModeRow[];
};

function byOrder<T extends { order: number }>(left: T, right: T): number {
  return left.order - right.order;
}

function mapVendor(vendor: { publicId: string | null; name: string } | null | undefined): FixtureExportVendor {
  return {
    publicId: vendor?.publicId ?? '',
    name: vendor?.name ?? '',
  };
}

function uniqueVendorsFromFixtures(fixtures: FixtureExportSource[]): FixtureExportVendor[] {
  const byPublicId = new Map<string, FixtureExportVendor>();
  for (const fixture of fixtures) {
    const vendor = mapVendor(fixture.fixtureVendor);
    const key = vendor.publicId || vendor.name;
    if (key) {
      byPublicId.set(key, vendor);
    }
  }
  return [...byPublicId.values()];
}

function sortVendors(vendors: FixtureExportVendor[]): FixtureExportVendor[] {
  return [...vendors].sort(
    (left, right) => left.name.localeCompare(right.name) || left.publicId.localeCompare(right.publicId),
  );
}

export function mapFixturesToExportDocument(
  fixtures: FixtureExportSource[],
  vendors?: FixtureExportVendor[],
): FixtureExportDocument {
  return {
    schemaVersion: FIXTURE_EXPORT_SCHEMA_VERSION,
    vendors: sortVendors(vendors ?? uniqueVendorsFromFixtures(fixtures)),
    fixtures: fixtures.map(fixture => ({
      publicId: fixture.publicId ?? '',
      name: fixture.name,
      vendor: mapVendor(fixture.fixtureVendor),
      channelDefinitions: [...(fixture.fixtureChannelDefinitions ?? [])].sort(byOrder).map(definition => ({
        publicId: definition.publicId ?? '',
        name: definition.name,
        order: definition.order,
        preset: definition.preset,
        ranges: [...(definition.fixtureChannelRanges ?? [])]
          .sort((left, right) => left.dmxStart - right.dmxStart)
          .map(range => ({
            publicId: range.publicId ?? '',
            dmxStart: range.dmxStart,
            dmxEnd: range.dmxEnd,
            description: range.description,
          })),
      })),
      channelModes: [...(fixture.fixtureChannelModes ?? [])].sort(byOrder).map(mode => ({
        publicId: mode.publicId ?? '',
        name: mode.name,
        order: mode.order,
        assignments: [...(mode.fixtureChannelAssignments ?? [])]
          .sort((left, right) => left.channelNumber - right.channelNumber)
          .map(assignment => ({
            channelNumber: assignment.channelNumber,
            channelDefinitionPublicId: assignment.fixtureChannelDefinition?.publicId ?? '',
          })),
      })),
    })),
  };
}
