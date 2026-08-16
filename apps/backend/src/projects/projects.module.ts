import { Module } from '@nestjs/common';
import { ProjectImportExportService } from './project-import-export.service';
import { ProjectResolver } from './project.resolver';
import { ProjectService } from './project.service';
import { ProjectRepository } from './repositories/project.repository';

@Module({
  providers: [ProjectRepository, ProjectService, ProjectImportExportService, ProjectResolver],
})
export class ProjectsModule {}
