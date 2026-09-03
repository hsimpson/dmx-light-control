import { ChannelModeNotFoundException, FixtureNotFoundException } from '@/fixtures/fixture.exceptions';
import { FixtureChannelModeRepository } from '@/fixtures/repositories/fixture-channel-mode.repository';
import { FixtureRepository } from '@/fixtures/repositories/fixture.repository';
import { Injectable } from '@nestjs/common';
import { AddProjectFixtureInput } from './dto/add-project-fixture.dto';
import { CreateProjectInput } from './dto/create-project.dto';
import { UpdateProjectFixtureInput } from './dto/update-project-fixture.dto';
import { UpdateProjectInput } from './dto/update-project.dto';
import {
  assertChannelModeBelongsToFixture,
  assertNoPatchOverlap,
  assertValidPatchAddress,
  channelCountFromMode,
  OccupiedPatch,
} from './project-fixture.validation';
import {
  ProjectAlreadyExistsException,
  ProjectFixtureNotFoundException,
  ProjectNotFoundException,
} from './project.exceptions';
import { ProjectFixtureRepository } from './repositories/project-fixture.repository';
import { LoadedProject, ProjectRepository } from './repositories/project.repository';

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

function mapProjectToDto(project: LoadedProject | undefined) {
  if (!project) {
    return undefined;
  }
  return {
    ...project,
    projectFixtures: sortProjectFixtures(project.projectFixtures).map(mapProjectFixtureToDto),
  };
}

@Injectable()
export class ProjectService {
  public constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly projectFixtureRepository: ProjectFixtureRepository,
    private readonly fixtureRepository: FixtureRepository,
    private readonly fixtureChannelModeRepository: FixtureChannelModeRepository,
  ) {}

  public async getAllProjects() {
    const projects = await this.projectRepository.findMany();
    return projects.map(project => ({ ...project, projectFixtures: [] }));
  }

  public async getProjectByPublicId(publicId: string) {
    const project = await this.projectRepository.findOneByPublicIdWithFixtures(publicId);
    return mapProjectToDto(project ?? undefined);
  }

  public async createProject(input: CreateProjectInput) {
    try {
      const created = await this.projectRepository.createOne(input);
      return created ? { ...created, projectFixtures: [] } : created;
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        throw new ProjectAlreadyExistsException(input.name);
      }
      throw error;
    }
  }

  public async updateProject(input: UpdateProjectInput) {
    try {
      const updated = await this.projectRepository.updateOneByPublicId(input.publicId, { name: input.name });
      if (!updated) {
        throw new ProjectNotFoundException(input.publicId);
      }
      return { ...updated, projectFixtures: [] };
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
