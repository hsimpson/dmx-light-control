import { describe, expect, it, vi } from 'vitest';
import { ProjectAlreadyExistsException, ProjectNotFoundException } from './project.exceptions';
import { ProjectService } from './project.service';
import { ProjectRepository } from './repositories/project.repository';

function build() {
  const projectRepository = {
    findMany: vi.fn<() => Promise<unknown[]>>(),
    findOneByPublicId: vi.fn<() => Promise<unknown>>(),
    createOne: vi.fn<() => Promise<unknown>>(),
    updateOneByPublicId: vi.fn<() => Promise<unknown>>(),
    deleteOneByPublicId: vi.fn<() => Promise<boolean>>(),
  };
  const service = new ProjectService(projectRepository as unknown as ProjectRepository);
  return { service, projectRepository };
}

describe('ProjectService', () => {
  it('getAllProjects delegates to repository', async () => {
    const { service, projectRepository } = build();
    projectRepository.findMany.mockResolvedValue(['p']);
    expect(await service.getAllProjects()).toEqual(['p']);
  });

  it('getProjectByPublicId delegates', async () => {
    const { service, projectRepository } = build();
    projectRepository.findOneByPublicId.mockResolvedValue('p');
    expect(await service.getProjectByPublicId('id')).toBe('p');
  });

  it('createProject delegates', async () => {
    const { service, projectRepository } = build();
    projectRepository.createOne.mockResolvedValue('created');
    expect(await service.createProject({ name: 'x' })).toBe('created');
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
    expect(result).toEqual({ name: 'new' });
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
