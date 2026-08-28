import { ExportTimestamps, ExportTimestampSource, mapExportTimestamps } from '@/db/export-timestamps';
import { FixtureChannelPreset } from './channel-presets';

export const FIXTURE_EXPORT_SCHEMA_VERSION = 1;

export type FixtureExportRange = {
  publicId: string;
  dmxStart: number;
  dmxEnd: number;
  description: string;
} & ExportTimestamps;

export type FixtureExportDefinition = {
  publicId: string;
  name: string;
  order: number;
  preset: FixtureChannelPreset;
  ranges: FixtureExportRange[];
} & ExportTimestamps;

export type FixtureExportAssignment = {
  channelNumber: number;
  channelDefinitionPublicId: string;
} & ExportTimestamps;

export type FixtureExportMode = {
  publicId: string;
  name: string;
  order: number;
  assignments: FixtureExportAssignment[];
} & ExportTimestamps;

export type FixtureExportVendor = {
  publicId: string;
  name: string;
} & ExportTimestamps;

export type FixtureExportFixture = {
  publicId: string;
  name: string;
  vendor: FixtureExportVendor;
  channelDefinitions: FixtureExportDefinition[];
  channelModes: FixtureExportMode[];
} & ExportTimestamps;

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
} & ExportTimestampSource;

type DefinitionRow = {
  publicId: string | null;
  name: string;
  order: number;
  preset: FixtureChannelPreset;
  fixtureChannelRanges?: RangeRow[];
} & ExportTimestampSource;

type AssignmentRow = {
  channelNumber: number;
  fixtureChannelDefinition?: { publicId: string | null } | null;
} & ExportTimestampSource;

type ModeRow = {
  publicId: string | null;
  name: string;
  order: number;
  fixtureChannelAssignments?: AssignmentRow[];
} & ExportTimestampSource;

export type FixtureExportSource = {
  publicId: string | null;
  name: string;
  fixtureVendor?: ({ publicId: string | null; name: string } & ExportTimestampSource) | null;
  fixtureChannelDefinitions?: DefinitionRow[];
  fixtureChannelModes?: ModeRow[];
} & ExportTimestampSource;

function byOrder<T extends { order: number }>(left: T, right: T): number {
  return left.order - right.order;
}

function mapVendor(
  vendor: ({ publicId: string | null; name: string } & ExportTimestampSource) | null | undefined,
): FixtureExportVendor {
  return {
    publicId: vendor?.publicId ?? '',
    name: vendor?.name ?? '',
    ...mapExportTimestamps(vendor ?? { createdAt: new Date(0), updatedAt: new Date(0) }),
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
      ...mapExportTimestamps(fixture),
      vendor: mapVendor(fixture.fixtureVendor),
      channelDefinitions: [...(fixture.fixtureChannelDefinitions ?? [])].sort(byOrder).map(definition => ({
        publicId: definition.publicId ?? '',
        name: definition.name,
        order: definition.order,
        preset: definition.preset,
        ...mapExportTimestamps(definition),
        ranges: [...(definition.fixtureChannelRanges ?? [])]
          .sort((left, right) => left.dmxStart - right.dmxStart)
          .map(range => ({
            publicId: range.publicId ?? '',
            dmxStart: range.dmxStart,
            dmxEnd: range.dmxEnd,
            description: range.description,
            ...mapExportTimestamps(range),
          })),
      })),
      channelModes: [...(fixture.fixtureChannelModes ?? [])].sort(byOrder).map(mode => ({
        publicId: mode.publicId ?? '',
        name: mode.name,
        order: mode.order,
        ...mapExportTimestamps(mode),
        assignments: [...(mode.fixtureChannelAssignments ?? [])]
          .sort((left, right) => left.channelNumber - right.channelNumber)
          .map(assignment => ({
            channelNumber: assignment.channelNumber,
            channelDefinitionPublicId: assignment.fixtureChannelDefinition?.publicId ?? '',
            ...mapExportTimestamps(assignment),
          })),
      })),
    })),
  };
}
