import { describe, expect, it } from 'vitest';
import { identityTransform } from './project-3d-object.transform';
import { ProjectEnvironmentType } from './project-environment';
import { mapProjectsToExportDocument } from './project-export.mapper';

const timestamps = {
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-02T00:00:00.000Z'),
};

describe('mapProjectsToExportDocument', () => {
  it('maps rows into a versioned document sorted by name', () => {
    expect(
      mapProjectsToExportDocument([
        {
          publicId: 'b',
          name: 'Zebra',
          environmentType: ProjectEnvironmentType.SimpleGround,
          roomWidth: 10,
          roomLength: 8,
          roomHeight: 5,
          projectFixtures: [],
          ...timestamps,
        },
        {
          publicId: 'a',
          name: 'Alpha',
          environmentType: ProjectEnvironmentType.Room,
          roomWidth: 10,
          roomLength: 8,
          roomHeight: 5,
          projectFixtures: [],
          ...timestamps,
        },
      ]),
    ).toEqual({
      schemaVersion: 7,
      projects: [
        {
          publicId: 'a',
          name: 'Alpha',
          environmentType: ProjectEnvironmentType.Room,
          roomWidth: 10,
          roomLength: 8,
          roomHeight: 5,
          projectFixtures: [],
          project3dObjects: [],
          ...timestamps,
        },
        {
          publicId: 'b',
          name: 'Zebra',
          environmentType: ProjectEnvironmentType.SimpleGround,
          roomWidth: 10,
          roomLength: 8,
          roomHeight: 5,
          projectFixtures: [],
          project3dObjects: [],
          ...timestamps,
        },
      ],
    });
  });

  it('maps null publicIds and missing relations to empty strings', () => {
    expect(
      mapProjectsToExportDocument([
        {
          publicId: null,
          name: 'Show',
          environmentType: ProjectEnvironmentType.Room,
          roomWidth: 10,
          roomLength: 8,
          roomHeight: 5,
          projectFixtures: [
            {
              publicId: null,
              startAddress: 1,
              fixture: null,
              fixtureChannelMode: null,
              ...timestamps,
            },
          ],
          project3dObjects: [
            {
              publicId: null,
              name: 'Untyped',
              sizeX: null,
              sizeY: null,
              sizeZ: null,
              transform: identityTransform(),
              sceneObjectType: null,
              ...timestamps,
            },
          ],
          ...timestamps,
        },
      ]),
    ).toEqual({
      schemaVersion: 7,
      projects: [
        {
          publicId: '',
          name: 'Show',
          environmentType: ProjectEnvironmentType.Room,
          roomWidth: 10,
          roomLength: 8,
          roomHeight: 5,
          projectFixtures: [
            {
              publicId: '',
              startAddress: 1,
              fixturePublicId: '',
              channelModePublicId: '',
              ...timestamps,
            },
          ],
          project3dObjects: [
            {
              publicId: '',
              name: 'Untyped',
              sceneObjectTypePublicId: '',
              sceneObjectTypeName: '',
              sizeX: null,
              sizeY: null,
              sizeZ: null,
              transform: identityTransform(),
              ...timestamps,
            },
          ],
          ...timestamps,
        },
      ],
    });
  });

  it('sorts projects with the same name by publicId', () => {
    const document = mapProjectsToExportDocument([
      {
        publicId: 'b',
        name: 'Same',
        environmentType: ProjectEnvironmentType.Room,
        roomWidth: 10,
        roomLength: 8,
        roomHeight: 5,
        ...timestamps,
      },
      {
        publicId: 'a',
        name: 'Same',
        environmentType: ProjectEnvironmentType.Room,
        roomWidth: 10,
        roomLength: 8,
        roomHeight: 5,
        ...timestamps,
      },
    ]);
    expect(document.projects.map(project => project.publicId)).toEqual(['a', 'b']);
  });

  it('sorts fixtures with the same start address by publicId', () => {
    const document = mapProjectsToExportDocument([
      {
        publicId: 'p',
        name: 'Show',
        environmentType: ProjectEnvironmentType.Room,
        roomWidth: 10,
        roomLength: 8,
        roomHeight: 5,
        projectFixtures: [
          {
            publicId: 'pf-b',
            startAddress: 1,
            fixture: { publicId: 'f-1' },
            fixtureChannelMode: { publicId: 'm-1' },
            ...timestamps,
          },
          {
            publicId: 'pf-a',
            startAddress: 1,
            fixture: { publicId: 'f-1' },
            fixtureChannelMode: { publicId: 'm-1' },
            ...timestamps,
          },
        ],
        ...timestamps,
      },
    ]);
    expect(document.projects[0]?.projectFixtures.map(fixture => fixture.publicId)).toEqual(['pf-a', 'pf-b']);
  });

  it('maps nested project fixtures sorted by start address', () => {
    expect(
      mapProjectsToExportDocument([
        {
          publicId: 'p',
          name: 'Show',
          environmentType: ProjectEnvironmentType.Room,
          roomWidth: 12,
          roomLength: 9,
          roomHeight: 4,
          projectFixtures: [
            {
              publicId: 'pf-2',
              startAddress: 10,
              fixture: { publicId: 'f-1' },
              fixtureChannelMode: { publicId: 'm-1' },
              ...timestamps,
            },
            {
              publicId: 'pf-1',
              startAddress: 1,
              fixture: { publicId: 'f-1' },
              fixtureChannelMode: { publicId: 'm-1' },
              ...timestamps,
            },
          ],
          project3dObjects: [
            {
              publicId: 'o-2',
              name: 'Box 2',
              sizeX: 2,
              sizeY: 0.5,
              sizeZ: 1,
              transform: identityTransform(),
              sceneObjectType: { publicId: 'type-1', name: 'Box' },
              ...timestamps,
            },
            {
              publicId: 'o-1',
              name: 'Light stand 1',
              sizeX: null,
              sizeY: null,
              sizeZ: null,
              transform: identityTransform(1, 0, 0),
              sceneObjectType: { publicId: 'type-2', name: 'Light stand' },
              ...timestamps,
            },
          ],
          ...timestamps,
        },
      ]),
    ).toEqual({
      schemaVersion: 7,
      projects: [
        {
          publicId: 'p',
          name: 'Show',
          environmentType: ProjectEnvironmentType.Room,
          roomWidth: 12,
          roomLength: 9,
          roomHeight: 4,
          projectFixtures: [
            {
              publicId: 'pf-1',
              startAddress: 1,
              fixturePublicId: 'f-1',
              channelModePublicId: 'm-1',
              ...timestamps,
            },
            {
              publicId: 'pf-2',
              startAddress: 10,
              fixturePublicId: 'f-1',
              channelModePublicId: 'm-1',
              ...timestamps,
            },
          ],
          project3dObjects: [
            {
              publicId: 'o-1',
              name: 'Light stand 1',
              sceneObjectTypePublicId: 'type-2',
              sceneObjectTypeName: 'Light stand',
              sizeX: null,
              sizeY: null,
              sizeZ: null,
              transform: identityTransform(1, 0, 0),
              ...timestamps,
            },
            {
              publicId: 'o-2',
              name: 'Box 2',
              sceneObjectTypePublicId: 'type-1',
              sceneObjectTypeName: 'Box',
              sizeX: 2,
              sizeY: 0.5,
              sizeZ: 1,
              transform: identityTransform(),
              ...timestamps,
            },
          ],
          ...timestamps,
        },
      ],
    });
  });
});
