import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { ProjectImportExportService } from './project-import-export.service';
import { ProjectResolver } from './project.resolver';
import { ProjectService } from './project.service';
import { ProjectsModule } from './projects.module';
import { ProjectFixtureRepository } from './repositories/project-fixture.repository';
import { ProjectRepository } from './repositories/project.repository';

describe('ProjectsModule', () => {
  it('is an NgModule providing its domain providers', () => {
    expect(ProjectsModule.name).toBe('ProjectsModule');
    const providers = Reflect.getMetadata('providers', ProjectsModule) as unknown[];
    const imports = Reflect.getMetadata('imports', ProjectsModule) as unknown[] | undefined;
    const exports = Reflect.getMetadata('exports', ProjectsModule) as unknown[] | undefined;
    expect(providers).toBeDefined();
    expect(providers).toContain(ProjectRepository);
    expect(providers).toContain(ProjectFixtureRepository);
    expect(providers).toContain(ProjectService);
    expect(providers).toContain(ProjectImportExportService);
    expect(providers).toContain(ProjectResolver);
    expect(imports).toBeDefined();
    expect(exports).toBeUndefined();
  });
});
