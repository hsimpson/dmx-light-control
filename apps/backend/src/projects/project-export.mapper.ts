import { ExportTimestamps, ExportTimestampSource, mapExportTimestamps } from '@/db/export-timestamps';

export const PROJECT_EXPORT_SCHEMA_VERSION = 3;

export type ProjectExportFixture = {
  publicId: string;
  startAddress: number;
  fixturePublicId: string;
  channelModePublicId: string;
} & ExportTimestamps;

export type ProjectExportProject = {
  publicId: string;
  name: string;
  roomWidth: number;
  roomLength: number;
  roomHeight: number;
  projectFixtures: ProjectExportFixture[];
} & ExportTimestamps;

export type ProjectExportDocument = {
  schemaVersion: number;
  projects: ProjectExportProject[];
};

export type ProjectExportFixtureSource = {
  publicId: string | null;
  startAddress: number;
  fixture: { publicId: string | null } | null;
  fixtureChannelMode: { publicId: string | null } | null;
} & ExportTimestampSource;

export type ProjectExportSource = {
  publicId: string | null;
  name: string;
  roomWidth: number;
  roomLength: number;
  roomHeight: number;
  projectFixtures?: ProjectExportFixtureSource[];
} & ExportTimestampSource;

function mapProjectFixtureToExport(fixture: ProjectExportFixtureSource): ProjectExportFixture {
  return {
    publicId: fixture.publicId ?? '',
    startAddress: fixture.startAddress,
    fixturePublicId: fixture.fixture?.publicId ?? '',
    channelModePublicId: fixture.fixtureChannelMode?.publicId ?? '',
    ...mapExportTimestamps(fixture),
  };
}

export function mapProjectsToExportDocument(projects: ProjectExportSource[]): ProjectExportDocument {
  return {
    schemaVersion: PROJECT_EXPORT_SCHEMA_VERSION,
    projects: [...projects]
      .map(project => ({
        publicId: project.publicId ?? '',
        name: project.name,
        roomWidth: project.roomWidth,
        roomLength: project.roomLength,
        roomHeight: project.roomHeight,
        projectFixtures: [...(project.projectFixtures ?? [])]
          .map(mapProjectFixtureToExport)
          .sort((left, right) => left.startAddress - right.startAddress || left.publicId.localeCompare(right.publicId)),
        ...mapExportTimestamps(project),
      }))
      .sort((left, right) => left.name.localeCompare(right.name) || left.publicId.localeCompare(right.publicId)),
  };
}
