import { FixturesModule } from '@/fixtures/fixtures.module';
import { Module } from '@nestjs/common';
import { ProjectImportExportService } from './project-import-export.service';
import { ProjectResolver } from './project.resolver';
import { ProjectService } from './project.service';
import { Project3dObjectRepository } from './repositories/project-3d-object.repository';
import { ProjectFixtureRepository } from './repositories/project-fixture.repository';
import { ProjectRepository } from './repositories/project.repository';
import { SceneObjectTypeRepository } from './repositories/scene-object-type.repository';

@Module({
  imports: [FixturesModule],
  providers: [
    ProjectRepository,
    ProjectFixtureRepository,
    Project3dObjectRepository,
    SceneObjectTypeRepository,
    ProjectService,
    ProjectImportExportService,
    ProjectResolver,
  ],
})
export class ProjectsModule {}
