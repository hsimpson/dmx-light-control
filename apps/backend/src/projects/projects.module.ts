import { EventsModule } from '@/events/events.module';
import { FixturesModule } from '@/fixtures/fixtures.module';
import { Module } from '@nestjs/common';
import { ProjectImportExportService } from './project-import-export.service';
import { ProjectResolver } from './project.resolver';
import { ProjectService } from './project.service';
import { Project3dObjectRepository } from './repositories/project-3d-object.repository';
import { ProjectFixtureRepository } from './repositories/project-fixture.repository';
import { ProjectFunctionRepository } from './repositories/project-function.repository';
import { ProjectRepository } from './repositories/project.repository';
import { SceneObjectTypeRepository } from './repositories/scene-object-type.repository';

@Module({
  imports: [FixturesModule, EventsModule],
  providers: [
    ProjectRepository,
    ProjectFixtureRepository,
    Project3dObjectRepository,
    ProjectFunctionRepository,
    SceneObjectTypeRepository,
    ProjectService,
    ProjectImportExportService,
    ProjectResolver,
  ],
  exports: [ProjectFunctionRepository],
})
export class ProjectsModule {}
