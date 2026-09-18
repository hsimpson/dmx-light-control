import { describe, expect, it, vi } from 'vitest';
import { identityTransform } from './project-3d-object.transform';
import { ProjectEnvironmentType } from './project-environment';
import { ProjectImportExportService } from './project-import-export.service';
import { ProjectResolver } from './project.resolver';
import { ProjectService } from './project.service';

describe('ProjectResolver', () => {
  function build() {
    const projectService = {
      getAllProjects: vi.fn(),
      getProjectByPublicId: vi.fn(),
      getSceneObjectTypes: vi.fn(),
      createProject: vi.fn(),
      updateProject: vi.fn(),
      updateProjectVirtualConsole: vi.fn(),
      deleteProjectByPublicId: vi.fn(),
      addProjectFixture: vi.fn(),
      updateProjectFixture: vi.fn(),
      deleteProjectFixtureByPublicId: vi.fn(),
      addProject3dObject: vi.fn(),
      updateProject3dObject: vi.fn(),
      deleteProject3dObjectByPublicId: vi.fn(),
    };
    const projectImportExportService = {
      exportProjects: vi.fn(),
      importProjects: vi.fn(),
    };
    const resolver = new ProjectResolver(
      projectService as unknown as ProjectService,
      projectImportExportService as unknown as ProjectImportExportService,
    );
    return { resolver, projectService, projectImportExportService };
  }

  it('getAllProjects maps service rows to DTOs', async () => {
    const { resolver, projectService } = build();
    projectService.getAllProjects.mockResolvedValue([{ publicId: 'p', name: 'Show' }]);
    await expect(resolver.getAllProjects()).resolves.toEqual([{ publicId: 'p', name: 'Show' }]);
  });

  it('getProjectByPublicId returns null when missing', async () => {
    const { resolver, projectService } = build();
    projectService.getProjectByPublicId.mockResolvedValue(undefined);
    await expect(resolver.getProjectByPublicId('missing')).resolves.toBeNull();
  });

  it('getProjectByPublicId maps a found project', async () => {
    const { resolver, projectService } = build();
    projectService.getProjectByPublicId.mockResolvedValue({ publicId: 'p', name: 'Show' });
    await expect(resolver.getProjectByPublicId('p')).resolves.toEqual({ publicId: 'p', name: 'Show' });
  });

  it('getSceneObjectTypes maps service rows to DTOs', async () => {
    const { resolver, projectService } = build();
    projectService.getSceneObjectTypes.mockResolvedValue([{ publicId: 'type', name: 'Box' }]);
    await expect(resolver.getSceneObjectTypes()).resolves.toEqual([{ publicId: 'type', name: 'Box' }]);
  });

  it('exportProjects maps the versioned document', async () => {
    const { resolver, projectImportExportService } = build();
    projectImportExportService.exportProjects.mockResolvedValue({ schemaVersion: 8, projects: [] });
    await expect(resolver.exportProjects()).resolves.toEqual({ schemaVersion: 8, projects: [] });
  });

  it('createProject and updateProject map service rows to DTOs', async () => {
    const { resolver, projectService } = build();
    projectService.createProject.mockResolvedValue({ publicId: 'p', name: 'New' });
    projectService.updateProject.mockResolvedValue({
      publicId: 'p',
      name: 'Updated',
      environmentType: ProjectEnvironmentType.Room,
    });
    await expect(resolver.createProject({ name: 'New' })).resolves.toEqual({ publicId: 'p', name: 'New' });
    await expect(resolver.updateProject({ publicId: 'p', name: 'Updated' })).resolves.toEqual({
      publicId: 'p',
      name: 'Updated',
      environmentType: ProjectEnvironmentType.Room,
    });
  });

  it('updateProjectVirtualConsole maps service rows to DTOs', async () => {
    const { resolver, projectService } = build();
    const virtualConsole = {
      schemaVersion: 1,
      width: 1280,
      height: 720,
      pages: [{ id: '11111111-1111-4111-8111-111111111111', name: 'Page 1', controls: [] }],
    };
    projectService.updateProjectVirtualConsole.mockResolvedValue({ publicId: 'p', virtualConsole });
    await expect(resolver.updateProjectVirtualConsole({ publicId: 'p', virtualConsole })).resolves.toEqual({
      publicId: 'p',
      virtualConsole,
    });
  });

  it('deleteProjectByPublicId maps the payload', async () => {
    const { resolver, projectService } = build();
    projectService.deleteProjectByPublicId.mockResolvedValue({ publicId: 'p', deleted: true });
    await expect(resolver.deleteProjectByPublicId('p')).resolves.toEqual({ publicId: 'p', deleted: true });
  });

  it('importProjects maps imported projects into the payload', async () => {
    const { resolver, projectImportExportService } = build();
    projectImportExportService.importProjects.mockResolvedValue({
      importedCount: 1,
      projects: [{ publicId: 'p', name: 'Imported' }],
    });
    await expect(
      resolver.importProjects({ schemaVersion: 1, projects: [{ publicId: 'p', name: 'Imported' }] }),
    ).resolves.toEqual({
      importedCount: 1,
      projects: [{ publicId: 'p', name: 'Imported' }],
    });
  });

  it('fixture mutations map service rows to DTOs', async () => {
    const { resolver, projectService } = build();
    projectService.addProjectFixture.mockResolvedValue({ publicId: 'pf-1', startAddress: 1 });
    projectService.updateProjectFixture.mockResolvedValue({ publicId: 'pf-1', startAddress: 10 });
    projectService.deleteProjectFixtureByPublicId.mockResolvedValue({ publicId: 'pf-1', deleted: true });

    await expect(
      resolver.addProjectFixture({
        projectPublicId: 'p',
        fixturePublicId: 'f',
        channelModePublicId: 'm',
        startAddress: 1,
      }),
    ).resolves.toEqual({ publicId: 'pf-1', startAddress: 1 });
    await expect(resolver.updateProjectFixture({ publicId: 'pf-1', startAddress: 10 })).resolves.toEqual({
      publicId: 'pf-1',
      startAddress: 10,
    });
    await expect(resolver.deleteProjectFixture('pf-1')).resolves.toEqual({ publicId: 'pf-1', deleted: true });
  });

  it('3D object mutations map service rows to DTOs', async () => {
    const { resolver, projectService } = build();
    projectService.addProject3dObject.mockResolvedValue({
      publicId: 'o-1',
      name: 'Box 1',
      transform: identityTransform(),
    });
    projectService.updateProject3dObject.mockResolvedValue({
      publicId: 'o-1',
      name: 'Box 1',
      sizeX: 3,
      transform: identityTransform(),
    });
    projectService.deleteProject3dObjectByPublicId.mockResolvedValue({ publicId: 'o-1', deleted: true });

    await expect(
      resolver.addProject3dObject({
        projectPublicId: 'p',
        sceneObjectTypePublicId: 'type',
      }),
    ).resolves.toMatchObject({ publicId: 'o-1', name: 'Box 1' });
    await expect(resolver.updateProject3dObject({ publicId: 'o-1', sizeX: 3 })).resolves.toMatchObject({
      publicId: 'o-1',
      sizeX: 3,
    });
    await expect(resolver.deleteProject3dObject('o-1')).resolves.toEqual({ publicId: 'o-1', deleted: true });
  });
});
