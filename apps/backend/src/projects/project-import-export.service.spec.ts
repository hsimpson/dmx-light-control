import { describe, expect, it, vi } from 'vitest';
import { identityTransform } from './project-3d-object.transform';
import { ProjectEnvironmentType } from './project-environment';
import { ProjectImportExportService } from './project-import-export.service';
import { ProjectImportConflictException, ProjectImportInvalidException } from './project.exceptions';
import { ProjectFixtureRepository } from './repositories/project-fixture.repository';
import { ProjectRepository } from './repositories/project.repository';

function createSelectChain(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  return { from, where, limit };
}

function createInsertChain(rows: unknown[]) {
  const returning = vi.fn().mockResolvedValue(rows);
  const values = vi.fn().mockReturnValue({ returning });
  return { values, returning };
}

function createUpdateChain(rows: unknown[]) {
  const returning = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  return { set, where, returning };
}

function createDeleteChain() {
  const where = vi.fn().mockResolvedValue(undefined);
  return { where };
}

const timestamps = {
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-02T00:00:00.000Z'),
};

describe('ProjectImportExportService', () => {
  it('exportProjects maps repository rows into a versioned document', async () => {
    const projectRepository = {
      findManyWithFixtures: vi.fn().mockResolvedValue([
        {
          publicId: 'proj-1',
          name: 'Main Show',
          environmentType: ProjectEnvironmentType.SimpleGround,
          roomWidth: 10,
          roomLength: 8,
          roomHeight: 5,
          projectFixtures: [],
          ...timestamps,
        },
      ]),
    };
    const service = new ProjectImportExportService(
      {} as never,
      projectRepository as unknown as ProjectRepository,
      {} as unknown as ProjectFixtureRepository,
    );

    await expect(service.exportProjects()).resolves.toEqual({
      schemaVersion: 8,
      projects: [
        {
          publicId: 'proj-1',
          name: 'Main Show',
          environmentType: ProjectEnvironmentType.SimpleGround,
          roomWidth: 10,
          roomLength: 8,
          roomHeight: 5,
          virtualConsole: null,
          projectFixtures: [],
          project3dObjects: [],
          ...timestamps,
        },
      ],
    });
  });

  it('importProjects rejects an unsupported schemaVersion before opening a transaction', async () => {
    const transaction = vi.fn();
    const service = new ProjectImportExportService(
      { transaction } as never,
      { findMany: vi.fn() } as unknown as ProjectRepository,
      {} as unknown as ProjectFixtureRepository,
    );

    await expect(
      service.importProjects({
        schemaVersion: 99,
        projects: [],
      }),
    ).rejects.toBeInstanceOf(ProjectImportInvalidException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('importProjects accepts schemaVersion 1', async () => {
    const transaction = vi.fn(async (callback: (tx: unknown) => Promise<string[]>) => callback({}));
    const service = new ProjectImportExportService(
      { transaction } as never,
      { findMany: vi.fn().mockResolvedValue([]) } as unknown as ProjectRepository,
      {} as unknown as ProjectFixtureRepository,
    );

    await expect(
      service.importProjects({
        schemaVersion: 1,
        projects: [],
      }),
    ).resolves.toEqual({ importedCount: 0, projects: [] });
  });

  it('importProjects inserts a new project by name when publicId is absent', async () => {
    const projectSelect = createSelectChain([]);
    const projectInsert = createInsertChain([{ id: 1, publicId: 'new-id', name: 'Fresh Show' }]);
    const tx = {
      select: vi.fn().mockReturnValue(projectSelect),
      insert: vi.fn().mockReturnValue(projectInsert),
      delete: vi.fn().mockReturnValue(createDeleteChain()),
      query: { fixtureChannelMode: { findFirst: vi.fn() } },
    };
    const transaction = vi.fn(async (callback: (innerTx: typeof tx) => Promise<string[]>) => callback(tx));
    const projectRepository = {
      findMany: vi.fn().mockResolvedValue([{ publicId: 'new-id', name: 'Fresh Show' }]),
    };
    const service = new ProjectImportExportService(
      { transaction } as never,
      projectRepository as unknown as ProjectRepository,
      {} as unknown as ProjectFixtureRepository,
    );

    await expect(
      service.importProjects({
        schemaVersion: 1,
        projects: [{ name: 'Fresh Show' }],
      }),
    ).resolves.toEqual({
      importedCount: 1,
      projects: [{ publicId: 'new-id', name: 'Fresh Show' }],
    });
    expect(projectInsert.values).toHaveBeenCalled();
  });

  it('importProjects updates an existing project matched by publicId', async () => {
    const projectSelect = createSelectChain([{ id: 1, publicId: 'p-1', name: 'Old Name' }]);
    const projectUpdate = createUpdateChain([{ id: 1, publicId: 'p-1', name: 'New Name' }]);
    const tx = {
      select: vi.fn().mockReturnValue(projectSelect),
      update: vi.fn().mockReturnValue(projectUpdate),
      delete: vi.fn().mockReturnValue(createDeleteChain()),
      query: { fixtureChannelMode: { findFirst: vi.fn() } },
    };
    const transaction = vi.fn(async (callback: (innerTx: typeof tx) => Promise<string[]>) => callback(tx));
    const projectRepository = {
      findMany: vi.fn().mockResolvedValue([{ publicId: 'p-1', name: 'New Name' }]),
    };
    const service = new ProjectImportExportService(
      { transaction } as never,
      projectRepository as unknown as ProjectRepository,
      {} as unknown as ProjectFixtureRepository,
    );

    await expect(
      service.importProjects({
        schemaVersion: 1,
        projects: [{ publicId: 'p-1', name: 'New Name' }],
      }),
    ).resolves.toEqual({
      importedCount: 1,
      projects: [{ publicId: 'p-1', name: 'New Name' }],
    });
    expect(projectUpdate.set).toHaveBeenCalled();
  });

  it('importProjects rejects when publicId and name match different projects', async () => {
    const projectSelect = {
      from: vi
        .fn()
        .mockReturnValueOnce({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 1, publicId: 'p-1', name: 'Alpha' }]),
          }),
        })
        .mockReturnValueOnce({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 2, publicId: 'p-2', name: 'Beta' }]),
          }),
        }),
    };
    const tx = { select: vi.fn().mockReturnValue(projectSelect) };
    const transaction = vi.fn(async (callback: (innerTx: typeof tx) => Promise<string[]>) => callback(tx));
    const service = new ProjectImportExportService(
      { transaction } as never,
      { findMany: vi.fn() } as unknown as ProjectRepository,
      {} as unknown as ProjectFixtureRepository,
    );

    await expect(
      service.importProjects({
        schemaVersion: 1,
        projects: [{ publicId: 'p-1', name: 'Beta' }],
      }),
    ).rejects.toBeInstanceOf(ProjectImportConflictException);
  });

  it('importProjects maps nested unique violation on insert to PROJECT_IMPORT_CONFLICT', async () => {
    const projectSelect = createSelectChain([]);
    const projectInsert = {
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockRejectedValue(Object.assign(new Error('unique'), { cause: { code: '23505' } })),
      }),
    };
    const tx = {
      select: vi.fn().mockReturnValue(projectSelect),
      insert: vi.fn().mockReturnValue(projectInsert),
      delete: vi.fn().mockReturnValue(createDeleteChain()),
      query: { fixtureChannelMode: { findFirst: vi.fn() } },
    };
    const transaction = vi.fn(async (callback: (innerTx: typeof tx) => Promise<string[]>) => callback(tx));
    const service = new ProjectImportExportService(
      { transaction } as never,
      { findMany: vi.fn() } as unknown as ProjectRepository,
      {} as unknown as ProjectFixtureRepository,
    );

    await expect(
      service.importProjects({
        schemaVersion: 1,
        projects: [{ name: 'Duplicate Show' }],
      }),
    ).rejects.toBeInstanceOf(ProjectImportConflictException);
  });

  it('importProjects rejects missing catalog fixtures', async () => {
    const projectSelect = createSelectChain([]);
    const projectInsert = createInsertChain([{ id: 1, publicId: 'p-1', name: 'Show' }]);
    const fixtureSelect = createSelectChain([]);
    const tx = {
      select: vi.fn().mockImplementation(() => {
        const chain = createSelectChain([]);
        chain.from.mockImplementation((table: { name?: string }) => {
          if (table.name === 'fixture') {
            return fixtureSelect;
          }
          return projectSelect;
        });
        return chain;
      }),
      insert: vi.fn().mockReturnValue(projectInsert),
      delete: vi.fn().mockReturnValue(createDeleteChain()),
      query: { fixtureChannelMode: { findFirst: vi.fn() } },
    };
    const transaction = vi.fn(async (callback: (innerTx: typeof tx) => Promise<string[]>) => callback(tx));
    const service = new ProjectImportExportService(
      { transaction } as never,
      { findMany: vi.fn() } as unknown as ProjectRepository,
      {} as unknown as ProjectFixtureRepository,
    );

    await expect(
      service.importProjects({
        schemaVersion: 2,
        projects: [
          {
            publicId: 'p-1',
            name: 'Show',
            projectFixtures: [{ fixturePublicId: 'missing', channelModePublicId: 'm-1', startAddress: 1 }],
          },
        ],
      }),
    ).rejects.toThrow('Fixture publicId missing not found');
  });

  it('importProjects resolves scene object types by name and auto-generates names', async () => {
    const projectSelect = createSelectChain([]);
    const projectInsert = createInsertChain([{ id: 1, publicId: 'p-1', name: 'Show' }]);
    const sceneTypeSelect = createSelectChain([
      { id: 2, publicId: 'type-1', name: 'Box', isScalable: true, defaultSizeX: 2, defaultSizeY: 0.5, defaultSizeZ: 1 },
    ]);
    const objectInsert = createInsertChain([{ id: 3 }]);
    let selectCall = 0;
    const tx = {
      select: vi.fn().mockImplementation(() => {
        selectCall += 1;
        if (selectCall <= 2) {
          return projectSelect;
        }
        return sceneTypeSelect;
      }),
      insert: vi.fn().mockImplementation(() => {
        if (selectCall <= 2) {
          return projectInsert;
        }
        return objectInsert;
      }),
      delete: vi.fn().mockReturnValue(createDeleteChain()),
      query: { fixtureChannelMode: { findFirst: vi.fn() } },
    };
    const transaction = vi.fn(async (callback: (innerTx: typeof tx) => Promise<string[]>) => callback(tx));
    const projectRepository = {
      findMany: vi.fn().mockResolvedValue([{ publicId: 'p-1', name: 'Show' }]),
    };
    const service = new ProjectImportExportService(
      { transaction } as never,
      projectRepository as unknown as ProjectRepository,
      {} as unknown as ProjectFixtureRepository,
    );

    await expect(
      service.importProjects({
        schemaVersion: 8,
        projects: [
          {
            publicId: 'p-1',
            name: 'Show',
            environmentType: ProjectEnvironmentType.Room,
            project3dObjects: [
              {
                sceneObjectTypePublicId: 'stale-id',
                sceneObjectTypeName: 'Box',
                sizeX: 2,
                sizeY: 0.5,
                sizeZ: 1,
                transform: identityTransform(),
              },
            ],
          },
        ],
      }),
    ).resolves.toEqual({
      importedCount: 1,
      projects: [{ publicId: 'p-1', name: 'Show' }],
    });
    expect(objectInsert.values).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Box 1',
      }),
    );
  });

  it('importProjects rejects duplicate scene object names in one document', async () => {
    const projectSelect = createSelectChain([]);
    const projectInsert = createInsertChain([{ id: 1, publicId: 'p-1', name: 'Show' }]);
    const sceneTypeSelect = createSelectChain([
      { id: 2, publicId: 'type-1', name: 'Box', isScalable: true, defaultSizeX: 2, defaultSizeY: 0.5, defaultSizeZ: 1 },
    ]);
    let selectCall = 0;
    const tx = {
      select: vi.fn().mockImplementation(() => {
        selectCall += 1;
        if (selectCall <= 2) {
          return projectSelect;
        }
        return sceneTypeSelect;
      }),
      insert: vi.fn().mockReturnValue(projectInsert),
      delete: vi.fn().mockReturnValue(createDeleteChain()),
      query: { fixtureChannelMode: { findFirst: vi.fn() } },
    };
    const transaction = vi.fn(async (callback: (innerTx: typeof tx) => Promise<string[]>) => callback(tx));
    const service = new ProjectImportExportService(
      { transaction } as never,
      { findMany: vi.fn() } as unknown as ProjectRepository,
      {} as unknown as ProjectFixtureRepository,
    );

    await expect(
      service.importProjects({
        schemaVersion: 8,
        projects: [
          {
            publicId: 'p-1',
            name: 'Show',
            project3dObjects: [
              {
                name: 'Stage',
                sceneObjectTypePublicId: 'type-1',
                sizeX: 2,
                sizeY: 0.5,
                sizeZ: 1,
                transform: identityTransform(),
              },
              {
                name: 'Stage',
                sceneObjectTypePublicId: 'type-1',
                sizeX: 2,
                sizeY: 0.5,
                sizeZ: 1,
                transform: identityTransform(),
              },
            ],
          },
        ],
      }),
    ).rejects.toThrow('Scene object name "Stage" is duplicated');
  });
});
