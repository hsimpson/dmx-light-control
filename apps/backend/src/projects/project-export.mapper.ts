import { ExportTimestamps, ExportTimestampSource, mapExportTimestamps } from '@/db/export-timestamps';
import type { IoDeviceIdentity } from '@/io/devices/match-io-devices';
import { ProjectEnvironmentType } from '@/projects/project-environment';
import { ProjectFunctionType, SequenceProperties } from '@/projects/project-function';
import { VirtualConsoleDocument } from '@/projects/virtual-console';
import { enrichVirtualConsoleForExport } from '@/projects/virtual-console.validation';

export const PROJECT_EXPORT_SCHEMA_VERSION = 11;

export type ProjectExportFixtureChannelAssignment = {
  publicId: string;
  channelNumber: number;
  channelDefinitionPublicId: string;
};

export type ProjectExportFixture = {
  publicId: string;
  startAddress: number;
  fixturePublicId: string;
  channelModePublicId: string;
  transform: number[];
  channelAssignments?: ProjectExportFixtureChannelAssignment[];
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

export type ProjectExportFunction = {
  publicId: string;
  name: string;
  type: ProjectFunctionType;
  sequence: SequenceProperties;
} & ExportTimestamps;

export type ProjectExportProject = {
  publicId: string;
  name: string;
  environmentType: ProjectEnvironmentType;
  roomWidth: number;
  roomLength: number;
  roomHeight: number;
  virtualConsole: VirtualConsoleDocument | null;
  ioDevices: IoDeviceIdentity[];
  projectFixtures: ProjectExportFixture[];
  project3dObjects: ProjectExport3dObject[];
  projectFunctions: ProjectExportFunction[];
} & ExportTimestamps;

export type ProjectExportDocument = {
  schemaVersion: number;
  projects: ProjectExportProject[];
};

export type ProjectExportFixtureSource = {
  publicId: string | null;
  startAddress: number;
  transform: number[];
  fixture: { publicId: string | null } | null;
  fixtureChannelMode: {
    publicId: string | null;
    fixtureChannelAssignments?: readonly {
      publicId: string | null;
      channelNumber: number;
      fixtureChannelDefinition?: { publicId: string | null } | null;
    }[];
  } | null;
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

export type ProjectExportFunctionSource = {
  publicId: string | null;
  name: string;
  type: ProjectFunctionType;
  properties: { sequence: SequenceProperties };
} & ExportTimestampSource;

export type ProjectExportSource = {
  publicId: string | null;
  name: string;
  environmentType: ProjectEnvironmentType;
  roomWidth: number;
  roomLength: number;
  roomHeight: number;
  virtualConsole?: VirtualConsoleDocument | null;
  ioDevices?: IoDeviceIdentity[];
  projectFixtures?: ProjectExportFixtureSource[];
  project3dObjects?: ProjectExport3dObjectSource[];
  projectFunctions?: ProjectExportFunctionSource[];
} & ExportTimestampSource;

function mapProjectFixtureToExport(fixture: ProjectExportFixtureSource): ProjectExportFixture {
  const assignments = [...(fixture.fixtureChannelMode?.fixtureChannelAssignments ?? [])]
    .sort((left, right) => left.channelNumber - right.channelNumber)
    .flatMap(assignment =>
      assignment.publicId
        ? [
            {
              publicId: assignment.publicId,
              channelNumber: assignment.channelNumber,
              channelDefinitionPublicId: assignment.fixtureChannelDefinition?.publicId ?? '',
            },
          ]
        : [],
    );
  return {
    publicId: fixture.publicId ?? '',
    startAddress: fixture.startAddress,
    fixturePublicId: fixture.fixture?.publicId ?? '',
    channelModePublicId: fixture.fixtureChannelMode?.publicId ?? '',
    transform: [...fixture.transform],
    ...(assignments.length > 0 ? { channelAssignments: assignments } : {}),
    ...mapExportTimestamps(fixture),
  };
}

function mapProjectFunctionToExport(fn: ProjectExportFunctionSource): ProjectExportFunction {
  return {
    publicId: fn.publicId ?? '',
    name: fn.name,
    type: fn.type,
    sequence: fn.properties.sequence,
    ...mapExportTimestamps(fn),
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
        virtualConsole: enrichVirtualConsoleForExport(
          project.virtualConsole,
          project.projectFixtures ?? [],
          project.projectFunctions ?? [],
        ),
        ioDevices: project.ioDevices ?? [],
        projectFixtures: [...(project.projectFixtures ?? [])]
          .map(mapProjectFixtureToExport)
          .sort((left, right) => left.startAddress - right.startAddress || left.publicId.localeCompare(right.publicId)),
        project3dObjects: [...(project.project3dObjects ?? [])]
          .map(mapProject3dObjectToExport)
          .sort((left, right) => left.publicId.localeCompare(right.publicId)),
        projectFunctions: [...(project.projectFunctions ?? [])]
          .map(mapProjectFunctionToExport)
          .sort((left, right) => left.name.localeCompare(right.name) || left.publicId.localeCompare(right.publicId)),
        ...mapExportTimestamps(project),
      }))
      .sort((left, right) => left.name.localeCompare(right.name) || left.publicId.localeCompare(right.publicId)),
  };
}
