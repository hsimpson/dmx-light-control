import { ExportTimestamps, ExportTimestampSource, mapExportTimestamps } from '@/db/export-timestamps';
import { ProjectEnvironmentType } from '@/projects/project-environment';

export const PROJECT_EXPORT_SCHEMA_VERSION = 7;

export type ProjectExportFixture = {
  publicId: string;
  startAddress: number;
  fixturePublicId: string;
  channelModePublicId: string;
} & ExportTimestamps;

export type ProjectExport3dObject = {
  publicId: string;
  name: string;
  sceneObjectTypePublicId: string;
  sceneObjectTypeName: string;
  sizeX: number | null;
  sizeY: number | null;
  sizeZ: number | null;
  transform: number[];
} & ExportTimestamps;

export type ProjectExportProject = {
  publicId: string;
  name: string;
  environmentType: ProjectEnvironmentType;
  roomWidth: number;
  roomLength: number;
  roomHeight: number;
  projectFixtures: ProjectExportFixture[];
  project3dObjects: ProjectExport3dObject[];
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

export type ProjectExport3dObjectSource = {
  publicId: string | null;
  name: string;
  sizeX: number | null;
  sizeY: number | null;
  sizeZ: number | null;
  transform: number[];
  sceneObjectType: { publicId: string | null; name: string } | null;
} & ExportTimestampSource;

export type ProjectExportSource = {
  publicId: string | null;
  name: string;
  environmentType: ProjectEnvironmentType;
  roomWidth: number;
  roomLength: number;
  roomHeight: number;
  projectFixtures?: ProjectExportFixtureSource[];
  project3dObjects?: ProjectExport3dObjectSource[];
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

function mapProject3dObjectToExport(object: ProjectExport3dObjectSource): ProjectExport3dObject {
  return {
    publicId: object.publicId ?? '',
    name: object.name,
    sceneObjectTypePublicId: object.sceneObjectType?.publicId ?? '',
    sceneObjectTypeName: object.sceneObjectType?.name ?? '',
    sizeX: object.sizeX,
    sizeY: object.sizeY,
    sizeZ: object.sizeZ,
    transform: [...object.transform],
    ...mapExportTimestamps(object),
  };
}

export function mapProjectsToExportDocument(projects: ProjectExportSource[]): ProjectExportDocument {
  return {
    schemaVersion: PROJECT_EXPORT_SCHEMA_VERSION,
    projects: [...projects]
      .map(project => ({
        publicId: project.publicId ?? '',
        name: project.name,
        environmentType: project.environmentType,
        roomWidth: project.roomWidth,
        roomLength: project.roomLength,
        roomHeight: project.roomHeight,
        projectFixtures: [...(project.projectFixtures ?? [])]
          .map(mapProjectFixtureToExport)
          .sort((left, right) => left.startAddress - right.startAddress || left.publicId.localeCompare(right.publicId)),
        project3dObjects: [...(project.project3dObjects ?? [])]
          .map(mapProject3dObjectToExport)
          .sort((left, right) => left.publicId.localeCompare(right.publicId)),
        ...mapExportTimestamps(project),
      }))
      .sort((left, right) => left.name.localeCompare(right.name) || left.publicId.localeCompare(right.publicId)),
  };
}
