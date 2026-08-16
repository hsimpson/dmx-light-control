import { describe, expect, it, vi } from 'vitest';
import { ProjectImportExportService } from './project-import-export.service';
import { ProjectImportInvalidException } from './project.exceptions';
import { ProjectRepository } from './repositories/project.repository';

describe('ProjectImportExportService', () => {
  it('exportProjects maps repository rows into a versioned document', async () => {
    const projectRepository = {
      findMany: vi.fn().mockResolvedValue([{ publicId: 'proj-1', name: 'Main Show' }]),
    };
    const service = new ProjectImportExportService({} as never, projectRepository as unknown as ProjectRepository);

    await expect(service.exportProjects()).resolves.toEqual({
      schemaVersion: 1,
      projects: [{ publicId: 'proj-1', name: 'Main Show' }],
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
