import { describe, expect, it, vi } from 'vitest';
import { ProjectAlreadyExistsException, ProjectNotFoundException } from './project.exceptions';
import { ProjectService } from './project.service';
import { ProjectFixtureRepository } from './repositories/project-fixture.repository';
import { ProjectRepository } from './repositories/project.repository';
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
    updateOneByPublicId: vi.fn(),
    deleteOneByPublicId: vi.fn(),
  };
  const fixtureRepository = { findOneByPublicId: vi.fn() };
  const fixtureChannelModeRepository = {
    findOneByPublicId: vi.fn(),
    findOneByIdWithAssignments: vi.fn(),
  };
  const service = new ProjectService(
    projectRepository as unknown as ProjectRepository,
    projectFixtureRepository as unknown as ProjectFixtureRepository,
    fixtureRepository as unknown as FixtureRepository,
    fixtureChannelModeRepository as unknown as FixtureChannelModeRepository,
  );
  return { service, projectRepository, projectFixtureRepository, fixtureRepository, fixtureChannelModeRepository };
}

describe('ProjectService', () => {
  it('getAllProjects delegates to repository and returns empty projectFixtures', async () => {
    const { service, projectRepository } = build();
    projectRepository.findMany.mockResolvedValue([{ publicId: 'p', name: 'x' }]);
    expect(await service.getAllProjects()).toEqual([{ publicId: 'p', name: 'x', projectFixtures: [] }]);
  });

  it('getProjectByPublicId delegates', async () => {
    const { service, projectRepository } = build();
    projectRepository.findOneByPublicIdWithFixtures.mockResolvedValue({
      publicId: 'p',
      name: 'x',
      projectFixtures: [],
    });
    expect(await service.getProjectByPublicId('id')).toEqual({ publicId: 'p', name: 'x', projectFixtures: [] });
  });

  it('createProject delegates', async () => {
    const { service, projectRepository } = build();
    projectRepository.createOne.mockResolvedValue({ publicId: 'p', name: 'x' });
    expect(await service.createProject({ name: 'x' })).toEqual({ publicId: 'p', name: 'x', projectFixtures: [] });
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
    expect(result).toEqual({ name: 'new', projectFixtures: [] });
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
});
