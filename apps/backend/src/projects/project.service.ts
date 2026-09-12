import { ChannelModeNotFoundException, FixtureNotFoundException } from '@/fixtures/fixture.exceptions';
import { FixtureChannelModeRepository } from '@/fixtures/repositories/fixture-channel-mode.repository';
import { FixtureRepository } from '@/fixtures/repositories/fixture.repository';
import { Injectable } from '@nestjs/common';
import { AddProject3dObjectInput } from './dto/add-project-3d-object.dto';
import { AddProjectFixtureInput } from './dto/add-project-fixture.dto';
import { CreateProjectInput } from './dto/create-project.dto';
import { UpdateProject3dObjectInput } from './dto/update-project-3d-object.dto';
import { UpdateProjectFixtureInput } from './dto/update-project-fixture.dto';
import { UpdateProjectInput } from './dto/update-project.dto';
import { UpdateProjectVirtualConsoleInput } from './dto/virtual-console.dto';
import { defaultTransformForObject } from './project-3d-object.transform';
import { nextUniqueSceneObjectName, normalizeSceneObjectName } from './project-3d-object-name';
import { assertValidTransform, resolveSizesForType } from './project-3d-object.validation';
import { optionalEnvironmentType } from './project-environment';
import {
  assertChannelModeBelongsToFixture,
  assertNoPatchOverlap,
  assertValidPatchAddress,
  channelCountFromMode,
  OccupiedPatch,
} from './project-fixture.validation';
import { optionalRoomDimensions } from './project-room-dimensions';
import { VirtualConsoleDocument } from './virtual-console';
import { assertValidVirtualConsole, normalizeVirtualConsole } from './virtual-console.validation';
import {
  Project3dObjectNameExistsException,
  Project3dObjectNotFoundException,
  ProjectAlreadyExistsException,
  ProjectFixtureNotFoundException,
  ProjectNotFoundException,
  SceneObjectTypeNotFoundException,
} from './project.exceptions';
import { Project3dObjectRepository } from './repositories/project-3d-object.repository';
import { ProjectFixtureRepository } from './repositories/project-fixture.repository';
import { LoadedProject, ProjectRepository } from './repositories/project.repository';
import { SceneObjectTypeRepository } from './repositories/scene-object-type.repository';

function getErrorCode(error: unknown): unknown {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }
  return error.code;
}

function isPostgresUniqueViolation(error: unknown): boolean {
  if (getErrorCode(error) === '23505') {
    return true;
  }
  if (typeof error !== 'object' || error === null || !('cause' in error)) {
    return false;
  }
  return getErrorCode(error.cause) === '23505';
}

type LoadedProjectFixture = NonNullable<LoadedProject['projectFixtures']>[number];
type LoadedProject3dObject = NonNullable<LoadedProject['project3dObjects']>[number];

function occupiedPatchesFromFixtures(
  fixtures: {
    publicId?: string | null;
    startAddress: number;
    fixtureChannelMode?: { fixtureChannelAssignments: { channelNumber: number }[] } | null;
  }[],
  ignorePublicId?: string,
): OccupiedPatch[] {
  return fixtures.flatMap(fixture => {
    if (ignorePublicId !== undefined && fixture.publicId === ignorePublicId) {
      return [];
    }

    const mode = fixture.fixtureChannelMode;
    if (!mode) {
      return [];
    }

    return [{ startAddress: fixture.startAddress, channelCount: channelCountFromMode(mode) }];
  });
}

function sortProjectFixtures(fixtures: LoadedProjectFixture[]): LoadedProjectFixture[] {
  return [...fixtures].sort(
    (left, right) =>
      left.startAddress - right.startAddress || (left.publicId ?? '').localeCompare(right.publicId ?? ''),
  );
}

function mapProjectFixtureToDto(fixture: LoadedProjectFixture) {
  const mode = fixture.fixtureChannelMode;
  if (!mode) {
    throw new ProjectFixtureNotFoundException(fixture.publicId ?? 'unknown');
  }
  return {
    publicId: fixture.publicId,
    createdAt: fixture.createdAt,
    updatedAt: fixture.updatedAt,
    startAddress: fixture.startAddress,
    fixture: fixture.fixture,
    channelMode: {
      publicId: mode.publicId,
      createdAt: mode.createdAt,
      updatedAt: mode.updatedAt,
      name: mode.name,
      fixtureChannelAssignments: mode.fixtureChannelAssignments.flatMap(assignment => {
        if (assignment.fixtureChannelDefinition === null) {
          return [];
        }

        return [
          {
            channelNumber: assignment.channelNumber,
            fixtureChannelDefinition: {
              preset: assignment.fixtureChannelDefinition.preset,
            },
          },
        ];
      }),
    },
  };
}

function sortProject3dObjects(objects: LoadedProject3dObject[]): LoadedProject3dObject[] {
  return [...objects].sort((left, right) => (left.publicId ?? '').localeCompare(right.publicId ?? ''));
}

function mapProject3dObjectToDto(object: LoadedProject3dObject) {
  const type = object.sceneObjectType;
  if (!type) {
    throw new Project3dObjectNotFoundException(object.publicId ?? 'unknown');
  }
  return {
    publicId: object.publicId,
    createdAt: object.createdAt,
    updatedAt: object.updatedAt,
    name: object.name,
    sizeX: object.sizeX ?? null,
    sizeY: object.sizeY ?? null,
    sizeZ: object.sizeZ ?? null,
    transform: [...object.transform],
    sceneObjectType: type,
  };
}

function withVirtualConsole<T extends { virtualConsole?: VirtualConsoleDocument | null }>(project: T) {
  return {
    ...project,
    virtualConsole: normalizeVirtualConsole(project.virtualConsole),
  };
}

function emptyProjectExtras() {
  return { projectFixtures: [], project3dObjects: [] };
}

function mapProjectToDto(project: LoadedProject | undefined) {
  if (!project) {
    return undefined;
  }
  return withVirtualConsole({
    ...project,
    projectFixtures: sortProjectFixtures(project.projectFixtures).map(mapProjectFixtureToDto),
    project3dObjects: sortProject3dObjects(project.project3dObjects).map(mapProject3dObjectToDto),
  });
}

@Injectable()
export class ProjectService {
  public constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly projectFixtureRepository: ProjectFixtureRepository,
    private readonly project3dObjectRepository: Project3dObjectRepository,
    private readonly sceneObjectTypeRepository: SceneObjectTypeRepository,
    private readonly fixtureRepository: FixtureRepository,
    private readonly fixtureChannelModeRepository: FixtureChannelModeRepository,
  ) {}

  public async getAllProjects() {
    const projects = await this.projectRepository.findMany();
    return projects.map(project => withVirtualConsole({ ...project, ...emptyProjectExtras() }));
  }

  public async getSceneObjectTypes() {
    const types = await this.sceneObjectTypeRepository.findMany();
    return [...types].sort((left, right) => left.name.localeCompare(right.name));
  }

  public async getProjectByPublicId(publicId: string) {
    const project = await this.projectRepository.findOneByPublicIdWithFixtures(publicId);
    return mapProjectToDto(project ?? undefined);
  }

  public async createProject(input: CreateProjectInput) {
    try {
      const created = await this.projectRepository.createOne(input);
      return created ? withVirtualConsole({ ...created, ...emptyProjectExtras() }) : created;
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        throw new ProjectAlreadyExistsException(input.name);
      }
      throw error;
    }
  }

  public async updateProject(input: UpdateProjectInput) {
    try {
      const updated = await this.projectRepository.updateOneByPublicId(input.publicId, {
        name: input.name,
        ...optionalEnvironmentType(input),
        ...optionalRoomDimensions(input),
      });
      if (!updated) {
        throw new ProjectNotFoundException(input.publicId);
      }
      return withVirtualConsole({ ...updated, ...emptyProjectExtras() });
    } catch (error) {
      if (error instanceof ProjectNotFoundException) {
        throw error;
      }
      if (isPostgresUniqueViolation(error)) {
        throw new ProjectAlreadyExistsException(input.name);
      }
      throw error;
    }
  }

  public async updateProjectVirtualConsole(input: UpdateProjectVirtualConsoleInput) {
    assertValidVirtualConsole(input.virtualConsole);
    const updated = await this.projectRepository.updateOneByPublicId(input.publicId, {
      virtualConsole: input.virtualConsole,
    });
    if (!updated) {
      throw new ProjectNotFoundException(input.publicId);
    }
    return withVirtualConsole({ ...updated, ...emptyProjectExtras() });
  }

  public async deleteProjectByPublicId(publicId: string): Promise<{ publicId: string; deleted: boolean }> {
    const deleted = await this.projectRepository.deleteOneByPublicId(publicId);
    return { publicId, deleted };
  }

  public async addProjectFixture(input: AddProjectFixtureInput) {
    const project = await this.projectRepository.findOneByPublicId(input.projectPublicId);
    if (!project?.id) {
      throw new ProjectNotFoundException(input.projectPublicId);
    }

    const fixture = await this.fixtureRepository.findOneByPublicId(input.fixturePublicId);
    if (!fixture?.id) {
      throw new FixtureNotFoundException(input.fixturePublicId);
    }

    const mode = await this.loadChannelModeWithAssignments(input.channelModePublicId);
    if (!mode.id) {
      throw new ChannelModeNotFoundException(input.channelModePublicId);
    }
    assertChannelModeBelongsToFixture(mode, fixture.id);
    assertValidPatchAddress(input.startAddress, mode);
    const occupied = occupiedPatchesFromFixtures(await this.projectFixtureRepository.findManyByProjectId(project.id));
    assertNoPatchOverlap(input.startAddress, channelCountFromMode(mode), occupied);

    const created = await this.projectFixtureRepository.createOne({
      projectId: project.id,
      fixtureId: fixture.id,
      fixtureChannelModeId: mode.id,
      startAddress: input.startAddress,
    });
    if (!created?.publicId) {
      throw new ProjectFixtureNotFoundException(input.projectPublicId);
    }

    const loaded = await this.projectFixtureRepository.findOneByPublicId(created.publicId);
    if (!loaded) {
      throw new ProjectFixtureNotFoundException(created.publicId);
    }
    return mapProjectFixtureToDto(loaded as LoadedProjectFixture);
  }

  public async updateProjectFixture(input: UpdateProjectFixtureInput) {
    const existing = await this.projectFixtureRepository.findOneByPublicId(input.publicId);
    if (!existing?.id || !existing.fixtureId) {
      throw new ProjectFixtureNotFoundException(input.publicId);
    }

    const startAddress = input.startAddress ?? existing.startAddress;
    let fixtureChannelModeId = existing.fixtureChannelModeId;

    if (input.channelModePublicId !== undefined) {
      const mode = await this.loadChannelModeWithAssignments(input.channelModePublicId);
      if (!mode.id) {
        throw new ChannelModeNotFoundException(input.channelModePublicId);
      }
      assertChannelModeBelongsToFixture(mode, existing.fixtureId);
      fixtureChannelModeId = mode.id;
    }

    const modeForValidation = await this.loadChannelModeById(fixtureChannelModeId);
    assertValidPatchAddress(startAddress, modeForValidation);
    if (!existing.projectId) {
      throw new ProjectFixtureNotFoundException(input.publicId);
    }
    const occupied = occupiedPatchesFromFixtures(
      await this.projectFixtureRepository.findManyByProjectId(existing.projectId),
      existing.publicId ?? undefined,
    );
    assertNoPatchOverlap(startAddress, channelCountFromMode(modeForValidation), occupied);

    const updated = await this.projectFixtureRepository.updateOneByPublicId(input.publicId, {
      startAddress,
      fixtureChannelModeId,
    });
    if (!updated?.publicId) {
      throw new ProjectFixtureNotFoundException(input.publicId);
    }

    const loaded = await this.projectFixtureRepository.findOneByPublicId(updated.publicId);
    if (!loaded) {
      throw new ProjectFixtureNotFoundException(updated.publicId);
    }
    return mapProjectFixtureToDto(loaded as LoadedProjectFixture);
  }

  public async deleteProjectFixtureByPublicId(publicId: string): Promise<{ publicId: string; deleted: boolean }> {
    const deleted = await this.projectFixtureRepository.deleteOneByPublicId(publicId);
    return { publicId, deleted };
  }

  public async addProject3dObject(input: AddProject3dObjectInput) {
    const project = await this.projectRepository.findOneByPublicId(input.projectPublicId);
    if (!project?.id) {
      throw new ProjectNotFoundException(input.projectPublicId);
    }

    const type = await this.sceneObjectTypeRepository.findOneByPublicId(input.sceneObjectTypePublicId);
    if (!type?.id) {
      throw new SceneObjectTypeNotFoundException(input.sceneObjectTypePublicId);
    }

    const sizes = resolveSizesForType(type.isScalable, input, {
      sizeX: type.defaultSizeX,
      sizeY: type.defaultSizeY,
      sizeZ: type.defaultSizeZ,
    });
    const transform = input.transform ?? defaultTransformForObject(type.isScalable, sizes.sizeY);
    assertValidTransform(transform);

    const siblings = await this.project3dObjectRepository.listByProjectId(project.id);
    const name =
      input.name === undefined
        ? nextUniqueSceneObjectName(
            type.name,
            siblings.filter(sibling => sibling.sceneObjectTypeId === type.id).length,
            siblings.map(sibling => sibling.name),
          )
        : normalizeSceneObjectName(input.name);

    let created;
    try {
      created = await this.project3dObjectRepository.createOne({
        projectId: project.id,
        sceneObjectTypeId: type.id,
        name,
        sizeX: sizes.sizeX,
        sizeY: sizes.sizeY,
        sizeZ: sizes.sizeZ,
        transform,
      });
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        throw new Project3dObjectNameExistsException(name);
      }
      throw error;
    }
    if (!created?.publicId) {
      throw new Project3dObjectNotFoundException(input.projectPublicId);
    }

    return this.loadProject3dObject(created.publicId);
  }

  public async updateProject3dObject(input: UpdateProject3dObjectInput) {
    const existing = await this.project3dObjectRepository.findOneByPublicId(input.publicId);
    if (!existing?.publicId) {
      throw new Project3dObjectNotFoundException(input.publicId);
    }

    const type = await this.sceneObjectTypeRepository.findOneById(existing.sceneObjectTypeId);
    if (!type) {
      throw new SceneObjectTypeNotFoundException(String(existing.sceneObjectTypeId));
    }
    const sizes = resolveSizesForType(
      type.isScalable,
      input,
      {
        sizeX: type.defaultSizeX,
        sizeY: type.defaultSizeY,
        sizeZ: type.defaultSizeZ,
      },
      {
        sizeX: existing.sizeX ?? null,
        sizeY: existing.sizeY ?? null,
        sizeZ: existing.sizeZ ?? null,
      },
    );
    const transform = input.transform ?? existing.transform;
    assertValidTransform(transform);

    const updatePayload: {
      sizeX: number | null;
      sizeY: number | null;
      sizeZ: number | null;
      transform: number[];
      name?: string;
    } = {
      sizeX: sizes.sizeX,
      sizeY: sizes.sizeY,
      sizeZ: sizes.sizeZ,
      transform,
    };
    if (input.name !== undefined) {
      updatePayload.name = normalizeSceneObjectName(input.name);
    }

    let updated;
    try {
      updated = await this.project3dObjectRepository.updateOneByPublicId(input.publicId, updatePayload);
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        throw new Project3dObjectNameExistsException(updatePayload.name ?? existing.name);
      }
      throw error;
    }
    if (!updated?.publicId) {
      throw new Project3dObjectNotFoundException(input.publicId);
    }

    return this.loadProject3dObject(updated.publicId);
  }

  public async deleteProject3dObjectByPublicId(publicId: string): Promise<{ publicId: string; deleted: boolean }> {
    const deleted = await this.project3dObjectRepository.deleteOneByPublicId(publicId);
    return { publicId, deleted };
  }

  private async loadProject3dObject(publicId: string) {
    const loaded = await this.project3dObjectRepository.findOneByPublicId(publicId);
    if (!loaded) {
      throw new Project3dObjectNotFoundException(publicId);
    }
    return mapProject3dObjectToDto(loaded as LoadedProject3dObject);
  }

  private async loadChannelModeWithAssignments(publicId: string) {
    const mode = await this.fixtureChannelModeRepository.findOneByPublicId(publicId);
    if (!mode?.id) {
      throw new ChannelModeNotFoundException(publicId);
    }
    return this.loadChannelModeById(mode.id);
  }

  private async loadChannelModeById(modeId: number) {
    const mode = await this.fixtureChannelModeRepository.findOneByIdWithAssignments(modeId);
    if (!mode?.id) {
      throw new ChannelModeNotFoundException(String(modeId));
    }
    return mode;
  }
}
