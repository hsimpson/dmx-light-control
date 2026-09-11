import { describe, expect, it, vi } from 'vitest';
import { identityTransform } from './project-3d-object.transform';
import { ProjectEnvironmentType } from './project-environment';
import { FixtureChannelPreset } from '@/fixtures/channel-presets';
import { ChannelModeNotFoundException, FixtureNotFoundException } from '@/fixtures/fixture.exceptions';
import {
  Project3dObjectNameExistsException,
  Project3dObjectNotFoundException,
  ProjectAlreadyExistsException,
  ProjectFixtureNotFoundException,
  ProjectNotFoundException,
  SceneObjectNotScalableException,
  SceneObjectTypeNotFoundException,
} from './project.exceptions';
import { ProjectService } from './project.service';
import { Project3dObjectRepository } from './repositories/project-3d-object.repository';
import { ProjectFixtureRepository } from './repositories/project-fixture.repository';
import { ProjectRepository } from './repositories/project.repository';
import { SceneObjectTypeRepository } from './repositories/scene-object-type.repository';
import { FixtureChannelModeRepository } from '@/fixtures/repositories/fixture-channel-mode.repository';
import { FixtureRepository } from '@/fixtures/repositories/fixture.repository';

function build() {
  const projectRepository = {
    findMany: vi.fn<() => Promise<unknown[]>>(),
    findOneByPublicId: vi.fn<() => Promise<unknown>>(),
    findOneByPublicIdWithFixtures: vi.fn<() => Promise<unknown>>(),
    createOne: vi.fn<() => Promise<unknown>>(),
    updateOneByPublicId: vi.fn<() => Promise<unknown>>(),
    deleteOneByPublicId: vi.fn<() => Promise<boolean>>(),
  };
  const projectFixtureRepository = {
    createOne: vi.fn(),
    findOneByPublicId: vi.fn(),
    findManyByProjectId: vi.fn().mockResolvedValue([]),
    updateOneByPublicId: vi.fn(),
    deleteOneByPublicId: vi.fn(),
  };
  const project3dObjectRepository = {
    createOne: vi.fn(),
    findOneByPublicId: vi.fn(),
    updateOneByPublicId: vi.fn(),
    deleteOneByPublicId: vi.fn(),
    listByProjectId: vi.fn().mockResolvedValue([]),
  };
  const sceneObjectTypeRepository = {
    findMany: vi.fn(),
    findOneByPublicId: vi.fn(),
    findOneById: vi.fn(),
  };
  const fixtureRepository = { findOneByPublicId: vi.fn() };
  const fixtureChannelModeRepository = {
    findOneByPublicId: vi.fn(),
    findOneByIdWithAssignments: vi.fn(),
  };
  const service = new ProjectService(
    projectRepository as unknown as ProjectRepository,
    projectFixtureRepository as unknown as ProjectFixtureRepository,
    project3dObjectRepository as unknown as Project3dObjectRepository,
    sceneObjectTypeRepository as unknown as SceneObjectTypeRepository,
    fixtureRepository as unknown as FixtureRepository,
    fixtureChannelModeRepository as unknown as FixtureChannelModeRepository,
  );
  return {
    service,
    projectRepository,
    projectFixtureRepository,
    project3dObjectRepository,
    sceneObjectTypeRepository,
    fixtureRepository,
    fixtureChannelModeRepository,
  };
}

describe('ProjectService', () => {
  it('getAllProjects delegates to repository and returns empty projectFixtures', async () => {
    const { service, projectRepository } = build();
    projectRepository.findMany.mockResolvedValue([{ publicId: 'p', name: 'x' }]);
    expect(await service.getAllProjects()).toEqual([
      { publicId: 'p', name: 'x', projectFixtures: [], project3dObjects: [] },
    ]);
  });

  it('getProjectByPublicId delegates', async () => {
    const { service, projectRepository } = build();
    projectRepository.findOneByPublicIdWithFixtures.mockResolvedValue({
      publicId: 'p',
      name: 'x',
      projectFixtures: [],
      project3dObjects: [],
    });
    expect(await service.getProjectByPublicId('id')).toEqual({
      publicId: 'p',
      name: 'x',
      projectFixtures: [],
      project3dObjects: [],
    });
  });

  it('createProject delegates', async () => {
    const { service, projectRepository } = build();
    projectRepository.createOne.mockResolvedValue({ publicId: 'p', name: 'x' });
    expect(await service.createProject({ name: 'x' })).toEqual({
      publicId: 'p',
      name: 'x',
      projectFixtures: [],
      project3dObjects: [],
    });
  });

  it('createProject maps unique violation to PROJECT_ALREADY_EXISTS', async () => {
    const { service, projectRepository } = build();
    projectRepository.createOne.mockRejectedValue(Object.assign(new Error('unique'), { code: '23505' }));
    await expect(service.createProject({ name: 'x' })).rejects.toBeInstanceOf(ProjectAlreadyExistsException);
  });

  it('createProject maps nested unique violation to PROJECT_ALREADY_EXISTS', async () => {
    const { service, projectRepository } = build();
    projectRepository.createOne.mockRejectedValue(Object.assign(new Error('unique'), { cause: { code: '23505' } }));
    await expect(service.createProject({ name: 'x' })).rejects.toBeInstanceOf(ProjectAlreadyExistsException);
  });

  it('createProject rethrows other errors', async () => {
    const { service, projectRepository } = build();
    const error = new Error('db');
    projectRepository.createOne.mockRejectedValue(error);
    await expect(service.createProject({ name: 'x' })).rejects.toBe(error);
  });

  it('updateProject updates name by publicId', async () => {
    const { service, projectRepository } = build();
    projectRepository.updateOneByPublicId.mockResolvedValue({ name: 'new' });
    const result = await service.updateProject({ publicId: 'p', name: 'new' });
    expect(projectRepository.updateOneByPublicId).toHaveBeenCalledWith('p', { name: 'new' });
    expect(result).toEqual({ name: 'new', projectFixtures: [], project3dObjects: [] });
  });

  it('updateProject patches room dimensions when provided', async () => {
    const { service, projectRepository } = build();
    projectRepository.updateOneByPublicId.mockResolvedValue({ name: 'new', roomWidth: 12 });
    await service.updateProject({
      publicId: 'p',
      name: 'new',
      environmentType: ProjectEnvironmentType.Room,
      roomWidth: 12,
      roomLength: 9,
      roomHeight: 4,
    });
    expect(projectRepository.updateOneByPublicId).toHaveBeenCalledWith('p', {
      name: 'new',
      environmentType: ProjectEnvironmentType.Room,
      roomWidth: 12,
      roomLength: 9,
      roomHeight: 4,
    });
  });

  it('updateProject throws PROJECT_NOT_FOUND when missing', async () => {
    const { service, projectRepository } = build();
    projectRepository.updateOneByPublicId.mockResolvedValue(undefined);
    await expect(service.updateProject({ publicId: 'p', name: 'new' })).rejects.toBeInstanceOf(
      ProjectNotFoundException,
    );
  });

  it('updateProject maps unique violation to PROJECT_ALREADY_EXISTS', async () => {
    const { service, projectRepository } = build();
    projectRepository.updateOneByPublicId.mockRejectedValue(Object.assign(new Error('unique'), { code: '23505' }));
    await expect(service.updateProject({ publicId: 'p', name: 'new' })).rejects.toBeInstanceOf(
      ProjectAlreadyExistsException,
    );
  });

  it('deleteProjectByPublicId returns publicId and deleted flag', async () => {
    const { service, projectRepository } = build();
    projectRepository.deleteOneByPublicId.mockResolvedValue(true);
    expect(await service.deleteProjectByPublicId('p')).toEqual({ publicId: 'p', deleted: true });
    projectRepository.deleteOneByPublicId.mockResolvedValue(false);
    expect(await service.deleteProjectByPublicId('p')).toEqual({ publicId: 'p', deleted: false });
  });

  it('addProject3dObject creates a scalable box with default size and floor transform', async () => {
    const { service, projectRepository, sceneObjectTypeRepository, project3dObjectRepository } = build();
    projectRepository.findOneByPublicId.mockResolvedValue({ id: 1, publicId: 'p' });
    sceneObjectTypeRepository.findOneByPublicId.mockResolvedValue({
      id: 2,
      publicId: 'type',
      name: 'Box',
      isScalable: true,
      defaultSizeX: 2,
      defaultSizeY: 0.5,
      defaultSizeZ: 1,
    });
    project3dObjectRepository.createOne.mockResolvedValue({ publicId: 'o' });
    const loaded = {
      publicId: 'o',
      name: 'Box 1',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      sizeX: 2,
      sizeY: 0.5,
      sizeZ: 1,
      transform: identityTransform(0, 0.25, 0),
      sceneObjectType: { publicId: 'type', isScalable: true, name: 'Box' },
    };
    project3dObjectRepository.findOneByPublicId.mockResolvedValue(loaded);

    await expect(
      service.addProject3dObject({
        projectPublicId: 'p',
        sceneObjectTypePublicId: 'type',
      }),
    ).resolves.toMatchObject({
      publicId: 'o',
      name: 'Box 1',
      sizeX: 2,
      sizeY: 0.5,
      sizeZ: 1,
      transform: identityTransform(0, 0.25, 0),
    });
    expect(project3dObjectRepository.listByProjectId).toHaveBeenCalledWith(1);
    expect(project3dObjectRepository.createOne).toHaveBeenCalledWith({
      projectId: 1,
      sceneObjectTypeId: 2,
      name: 'Box 1',
      sizeX: 2,
      sizeY: 0.5,
      sizeZ: 1,
      transform: identityTransform(0, 0.25, 0),
    });
  });

  it('addProject3dObject assigns Box 2 when Box 1 already exists', async () => {
    const { service, projectRepository, sceneObjectTypeRepository, project3dObjectRepository } = build();
    projectRepository.findOneByPublicId.mockResolvedValue({ id: 1, publicId: 'p' });
    sceneObjectTypeRepository.findOneByPublicId.mockResolvedValue({
      id: 2,
      publicId: 'type',
      name: 'Box',
      isScalable: true,
      defaultSizeX: 2,
      defaultSizeY: 0.5,
      defaultSizeZ: 1,
    });
    project3dObjectRepository.listByProjectId.mockResolvedValue([{ sceneObjectTypeId: 2, name: 'Box 1' }]);
    project3dObjectRepository.createOne.mockResolvedValue({ publicId: 'o2' });
    project3dObjectRepository.findOneByPublicId.mockResolvedValue({
      publicId: 'o2',
      name: 'Box 2',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      sizeX: 2,
      sizeY: 0.5,
      sizeZ: 1,
      transform: identityTransform(0, 0.25, 0),
      sceneObjectType: { publicId: 'type', isScalable: true, name: 'Box' },
    });

    await service.addProject3dObject({
      projectPublicId: 'p',
      sceneObjectTypePublicId: 'type',
    });

    expect(project3dObjectRepository.createOne).toHaveBeenCalledWith(expect.objectContaining({ name: 'Box 2' }));
  });

  it('addProject3dObject maps unique violation to PROJECT_3D_OBJECT_NAME_EXISTS', async () => {
    const { service, projectRepository, sceneObjectTypeRepository, project3dObjectRepository } = build();
    projectRepository.findOneByPublicId.mockResolvedValue({ id: 1, publicId: 'p' });
    sceneObjectTypeRepository.findOneByPublicId.mockResolvedValue({
      id: 2,
      publicId: 'type',
      name: 'Box',
      isScalable: true,
      defaultSizeX: 2,
      defaultSizeY: 0.5,
      defaultSizeZ: 1,
    });
    project3dObjectRepository.createOne.mockRejectedValue(Object.assign(new Error('unique'), { code: '23505' }));

    await expect(
      service.addProject3dObject({
        projectPublicId: 'p',
        sceneObjectTypePublicId: 'type',
        name: 'Box 1',
      }),
    ).rejects.toBeInstanceOf(Project3dObjectNameExistsException);
  });

  it('updateProject3dObject throws PROJECT_3D_OBJECT_NAME_EXISTS on duplicate rename', async () => {
    const { service, sceneObjectTypeRepository, project3dObjectRepository } = build();
    project3dObjectRepository.findOneByPublicId.mockResolvedValue({
      publicId: 'o',
      sceneObjectTypeId: 2,
      name: 'Box 1',
      sizeX: 2,
      sizeY: 0.5,
      sizeZ: 1,
      transform: identityTransform(0, 0.25, 0),
    });
    sceneObjectTypeRepository.findOneById.mockResolvedValue({
      id: 2,
      publicId: 'type',
      name: 'Box',
      isScalable: true,
      defaultSizeX: 2,
      defaultSizeY: 0.5,
      defaultSizeZ: 1,
    });
    project3dObjectRepository.listByProjectId.mockResolvedValue([{ sceneObjectTypeId: 2, name: 'Box 2' }]);
    project3dObjectRepository.updateOneByPublicId.mockRejectedValue(
      Object.assign(new Error('unique'), { code: '23505' }),
    );

    await expect(
      service.updateProject3dObject({
        publicId: 'o',
        name: 'Box 2',
      }),
    ).rejects.toBeInstanceOf(Project3dObjectNameExistsException);
  });

  it('getSceneObjectTypes sorts types by name', async () => {
    const { service, sceneObjectTypeRepository } = build();
    sceneObjectTypeRepository.findMany.mockResolvedValue([{ name: 'Zebra' }, { name: 'Alpha' }]);
    expect(await service.getSceneObjectTypes()).toEqual([{ name: 'Alpha' }, { name: 'Zebra' }]);
  });

  it('getProjectByPublicId returns undefined when missing', async () => {
    const { service, projectRepository } = build();
    projectRepository.findOneByPublicIdWithFixtures.mockResolvedValue(null);
    expect(await service.getProjectByPublicId('missing')).toBeUndefined();
  });

  it('getProjectByPublicId maps fixtures and skips null channel definitions', async () => {
    const { service, projectRepository } = build();
    projectRepository.findOneByPublicIdWithFixtures.mockResolvedValue({
      publicId: 'p',
      name: 'Show',
      projectFixtures: [
        {
          publicId: 'pf-1',
          startAddress: 1,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-01-01T00:00:00.000Z'),
          fixture: { publicId: 'f-1' },
          fixtureChannelMode: {
            publicId: 'm-1',
            name: '4ch',
            createdAt: new Date('2024-01-01T00:00:00.000Z'),
            updatedAt: new Date('2024-01-01T00:00:00.000Z'),
            fixtureChannelAssignments: [
              {
                channelNumber: 1,
                fixtureChannelDefinition: {
                  preset: FixtureChannelPreset.IntensityDimmer,
                },
              },
              {
                channelNumber: 2,
                fixtureChannelDefinition: null,
              },
            ],
          },
        },
      ],
      project3dObjects: [],
    });
    expect(await service.getProjectByPublicId('p')).toMatchObject({
      projectFixtures: [
        {
          publicId: 'pf-1',
          channelMode: {
            fixtureChannelAssignments: [{ channelNumber: 1 }],
          },
        },
      ],
    });
  });

  it('addProjectFixture creates and returns a mapped fixture', async () => {
    const { service, projectRepository, fixtureRepository, fixtureChannelModeRepository, projectFixtureRepository } =
      build();
    projectRepository.findOneByPublicId.mockResolvedValue({ id: 1, publicId: 'p' });
    fixtureRepository.findOneByPublicId.mockResolvedValue({ id: 2, publicId: 'f-1' });
    fixtureChannelModeRepository.findOneByPublicId.mockResolvedValue({ id: 3, publicId: 'm-1' });
    fixtureChannelModeRepository.findOneByIdWithAssignments.mockResolvedValue({
      id: 3,
      publicId: 'm-1',
      fixtureId: 2,
      fixtureChannelAssignments: [
        { channelNumber: 1, fixtureChannelDefinition: { preset: FixtureChannelPreset.IntensityDimmer } },
      ],
    });
    projectFixtureRepository.createOne.mockResolvedValue({ publicId: 'pf-1' });
    projectFixtureRepository.findOneByPublicId.mockResolvedValue({
      publicId: 'pf-1',
      startAddress: 1,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      fixture: { publicId: 'f-1' },
      fixtureChannelMode: {
        publicId: 'm-1',
        name: '4ch',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        fixtureChannelAssignments: [],
      },
    });

    await expect(
      service.addProjectFixture({
        projectPublicId: 'p',
        fixturePublicId: 'f-1',
        channelModePublicId: 'm-1',
        startAddress: 1,
      }),
    ).resolves.toMatchObject({ publicId: 'pf-1', startAddress: 1 });
  });

  it('addProjectFixture throws when project is missing', async () => {
    const { service, projectRepository } = build();
    projectRepository.findOneByPublicId.mockResolvedValue(undefined);
    await expect(
      service.addProjectFixture({
        projectPublicId: 'p',
        fixturePublicId: 'f-1',
        channelModePublicId: 'm-1',
        startAddress: 1,
      }),
    ).rejects.toBeInstanceOf(ProjectNotFoundException);
  });

  it('addProjectFixture throws when fixture is missing', async () => {
    const { service, projectRepository, fixtureRepository } = build();
    projectRepository.findOneByPublicId.mockResolvedValue({ id: 1, publicId: 'p' });
    fixtureRepository.findOneByPublicId.mockResolvedValue(undefined);
    await expect(
      service.addProjectFixture({
        projectPublicId: 'p',
        fixturePublicId: 'f-1',
        channelModePublicId: 'm-1',
        startAddress: 1,
      }),
    ).rejects.toBeInstanceOf(FixtureNotFoundException);
  });

  it('updateProjectFixture changes channel mode and keeps existing start address', async () => {
    const { service, projectFixtureRepository, fixtureChannelModeRepository } = build();
    projectFixtureRepository.findOneByPublicId.mockResolvedValue({
      id: 1,
      publicId: 'pf-1',
      projectId: 10,
      fixtureId: 2,
      fixtureChannelModeId: 3,
      startAddress: 5,
    });
    fixtureChannelModeRepository.findOneByIdWithAssignments.mockResolvedValue({
      id: 4,
      publicId: 'm-2',
      fixtureId: 2,
      fixtureChannelAssignments: [
        { channelNumber: 1, fixtureChannelDefinition: { preset: FixtureChannelPreset.IntensityDimmer } },
      ],
    });
    projectFixtureRepository.updateOneByPublicId.mockResolvedValue({ publicId: 'pf-1' });
    projectFixtureRepository.findOneByPublicId
      .mockResolvedValueOnce({
        id: 1,
        publicId: 'pf-1',
        projectId: 10,
        fixtureId: 2,
        fixtureChannelModeId: 3,
        startAddress: 5,
      })
      .mockResolvedValueOnce({
        publicId: 'pf-1',
        startAddress: 5,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        fixture: { publicId: 'f-1' },
        fixtureChannelMode: {
          publicId: 'm-2',
          name: '2ch',
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-01-01T00:00:00.000Z'),
          fixtureChannelAssignments: [],
        },
      });
    fixtureChannelModeRepository.findOneByPublicId.mockResolvedValue({ id: 4, publicId: 'm-2' });

    await expect(
      service.updateProjectFixture({
        publicId: 'pf-1',
        channelModePublicId: 'm-2',
      }),
    ).resolves.toMatchObject({ publicId: 'pf-1', startAddress: 5 });
    expect(projectFixtureRepository.updateOneByPublicId).toHaveBeenCalledWith('pf-1', {
      startAddress: 5,
      fixtureChannelModeId: 4,
    });
  });

  it('updateProjectFixture throws when instance is missing', async () => {
    const { service, projectFixtureRepository } = build();
    projectFixtureRepository.findOneByPublicId.mockResolvedValue(undefined);
    await expect(service.updateProjectFixture({ publicId: 'pf-1', startAddress: 1 })).rejects.toBeInstanceOf(
      ProjectFixtureNotFoundException,
    );
  });

  it('deleteProjectFixtureByPublicId returns deleted flag', async () => {
    const { service, projectFixtureRepository } = build();
    projectFixtureRepository.deleteOneByPublicId.mockResolvedValue(true);
    expect(await service.deleteProjectFixtureByPublicId('pf-1')).toEqual({ publicId: 'pf-1', deleted: true });
  });

  it('deleteProject3dObjectByPublicId returns deleted flag', async () => {
    const { service, project3dObjectRepository } = build();
    project3dObjectRepository.deleteOneByPublicId.mockResolvedValue(false);
    expect(await service.deleteProject3dObjectByPublicId('o-1')).toEqual({ publicId: 'o-1', deleted: false });
  });

  it('updateProject3dObject updates sizes without renaming', async () => {
    const { service, sceneObjectTypeRepository, project3dObjectRepository } = build();
    const existing = {
      publicId: 'o',
      sceneObjectTypeId: 2,
      name: 'Box 1',
      sizeX: 2,
      sizeY: 0.5,
      sizeZ: 1,
      transform: identityTransform(0, 0.25, 0),
    };
    const loaded = {
      publicId: 'o',
      name: 'Box 1',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      sizeX: 3,
      sizeY: 0.5,
      sizeZ: 1,
      transform: identityTransform(0, 0.25, 0),
      sceneObjectType: { publicId: 'type', name: 'Box', isScalable: true },
    };
    project3dObjectRepository.findOneByPublicId.mockResolvedValueOnce(existing).mockResolvedValueOnce(loaded);
    sceneObjectTypeRepository.findOneById.mockResolvedValue({
      id: 2,
      publicId: 'type',
      name: 'Box',
      isScalable: true,
      defaultSizeX: 2,
      defaultSizeY: 0.5,
      defaultSizeZ: 1,
    });
    project3dObjectRepository.updateOneByPublicId.mockResolvedValue({ publicId: 'o' });

    await expect(service.updateProject3dObject({ publicId: 'o', sizeX: 3 })).resolves.toMatchObject({
      publicId: 'o',
      sizeX: 3,
    });
  });

  it('updateProject3dObject throws when scene object type is missing', async () => {
    const { service, sceneObjectTypeRepository, project3dObjectRepository } = build();
    project3dObjectRepository.findOneByPublicId.mockResolvedValue({
      publicId: 'o',
      sceneObjectTypeId: 99,
      name: 'Box 1',
      transform: identityTransform(),
    });
    sceneObjectTypeRepository.findOneById.mockResolvedValue(undefined);
    await expect(service.updateProject3dObject({ publicId: 'o', sizeX: 3 })).rejects.toBeInstanceOf(
      SceneObjectTypeNotFoundException,
    );
  });

  it('updateProject3dObject throws when updated row is missing', async () => {
    const { service, sceneObjectTypeRepository, project3dObjectRepository } = build();
    project3dObjectRepository.findOneByPublicId.mockResolvedValue({
      publicId: 'o',
      sceneObjectTypeId: 2,
      name: 'Box 1',
      sizeX: 2,
      sizeY: 0.5,
      sizeZ: 1,
      transform: identityTransform(),
    });
    sceneObjectTypeRepository.findOneById.mockResolvedValue({
      id: 2,
      isScalable: true,
      defaultSizeX: 2,
      defaultSizeY: 0.5,
      defaultSizeZ: 1,
    });
    project3dObjectRepository.updateOneByPublicId.mockResolvedValue(undefined);
    await expect(service.updateProject3dObject({ publicId: 'o', sizeX: 3 })).rejects.toBeInstanceOf(
      Project3dObjectNotFoundException,
    );
  });

  it('updateProject rethrows ProjectNotFoundException', async () => {
    const { service, projectRepository } = build();
    const error = new ProjectNotFoundException('p');
    projectRepository.updateOneByPublicId.mockRejectedValue(error);
    await expect(service.updateProject({ publicId: 'p', name: 'new' })).rejects.toBe(error);
  });

  it('updateProject rethrows non-unique errors', async () => {
    const { service, projectRepository } = build();
    const error = new Error('db');
    projectRepository.updateOneByPublicId.mockRejectedValue(error);
    await expect(service.updateProject({ publicId: 'p', name: 'new' })).rejects.toBe(error);
  });

  it('addProjectFixture throws when channel mode publicId lookup has no id', async () => {
    const { service, projectRepository, fixtureRepository, fixtureChannelModeRepository } = build();
    projectRepository.findOneByPublicId.mockResolvedValue({ id: 1, publicId: 'p' });
    fixtureRepository.findOneByPublicId.mockResolvedValue({ id: 2, publicId: 'f-1' });
    fixtureChannelModeRepository.findOneByPublicId.mockResolvedValue({ publicId: 'm-1' });
    await expect(
      service.addProjectFixture({
        projectPublicId: 'p',
        fixturePublicId: 'f-1',
        channelModePublicId: 'm-1',
        startAddress: 1,
      }),
    ).rejects.toBeInstanceOf(ChannelModeNotFoundException);
  });

  it('addProject3dObject rejects sizes on a fixed-size type', async () => {
    const { service, projectRepository, sceneObjectTypeRepository } = build();
    projectRepository.findOneByPublicId.mockResolvedValue({ id: 1, publicId: 'p' });
    sceneObjectTypeRepository.findOneByPublicId.mockResolvedValue({
      id: 2,
      publicId: 'type',
      isScalable: false,
      defaultSizeX: 1,
      defaultSizeY: 1,
      defaultSizeZ: 1,
    });
    await expect(
      service.addProject3dObject({
        projectPublicId: 'p',
        sceneObjectTypePublicId: 'type',
        sizeX: 2,
      }),
    ).rejects.toBeInstanceOf(SceneObjectNotScalableException);
  });
});
