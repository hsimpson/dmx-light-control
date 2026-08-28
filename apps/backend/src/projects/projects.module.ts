import { FixturesModule } from '@/fixtures/fixtures.module';
import { Module } from '@nestjs/common';
import { ProjectImportExportService } from './project-import-export.service';
import { ProjectResolver } from './project.resolver';
import { ProjectService } from './project.service';
import { ProjectFixtureRepository } from './repositories/project-fixture.repository';
import { ProjectRepository } from './repositories/project.repository';

@Module({
  imports: [FixturesModule],
  providers: [ProjectRepository, ProjectFixtureRepository, ProjectService, ProjectImportExportService, ProjectResolver],
})
export class ProjectsModule {}
