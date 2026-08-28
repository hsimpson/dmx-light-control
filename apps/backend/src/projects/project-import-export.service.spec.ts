import { describe, expect, it, vi } from 'vitest';
import { ProjectImportExportService } from './project-import-export.service';
import { ProjectImportInvalidException } from './project.exceptions';
import { ProjectRepository } from './repositories/project.repository';

const timestamps = {
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-02T00:00:00.000Z'),
};

describe('ProjectImportExportService', () => {
  it('exportProjects maps repository rows into a versioned document', async () => {
    const projectRepository = {
      findMany: vi.fn().mockResolvedValue([{ publicId: 'proj-1', name: 'Main Show', ...timestamps }]),
    };
    const service = new ProjectImportExportService({} as never, projectRepository as unknown as ProjectRepository);

    await expect(service.exportProjects()).resolves.toEqual({
      schemaVersion: 1,
      projects: [{ publicId: 'proj-1', name: 'Main Show', ...timestamps }],
    });
  });

  it('importProjects rejects an unsupported schemaVersion before opening a transaction', async () => {
    const transaction = vi.fn();
    const service = new ProjectImportExportService(
      { transaction } as never,
      { findMany: vi.fn() } as unknown as ProjectRepository,
    );

    await expect(
      service.importProjects({
        schemaVersion: 2,
        projects: [],
      }),
    ).rejects.toBeInstanceOf(ProjectImportInvalidException);
    expect(transaction).not.toHaveBeenCalled();
  });
});
