import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { plainToInstance } from 'class-transformer';
import { GraphQLUUID } from 'graphql-scalars';
import { CreateProjectInput } from './dto/create-project.dto';
import { DeleteProjectPayload } from './dto/delete-project-payload.dto';
import { ProjectExportDocumentDto } from './dto/export-projects.dto';
import { ImportProjectsInput, ImportProjectsPayload } from './dto/import-projects.dto';
import { ProjectDto } from './dto/project.dto';
import { UpdateProjectInput } from './dto/update-project.dto';
import { ProjectImportExportService } from './project-import-export.service';
import { ProjectService } from './project.service';

@Resolver()
export class ProjectResolver {
  public constructor(
    private readonly projectService: ProjectService,
    private readonly projectImportExportService: ProjectImportExportService,
  ) {}

  @Query(() => [ProjectDto], {
    name: 'projects',
    description: 'get all projects',
  })
  public async getAllProjects(): Promise<ProjectDto[]> {
    const projects = await this.projectService.getAllProjects();
    return plainToInstance(ProjectDto, projects);
  }

  @Query(() => ProjectDto, {
    name: 'project',
    description: 'get project by external id',
    nullable: true,
  })
  public async getProjectByPublicId(
    @Args('publicId', { type: () => GraphQLUUID }) publicId: string,
  ): Promise<ProjectDto | null> {
    const project = await this.projectService.getProjectByPublicId(publicId);
    if (!project) {
      return null;
    }
    return plainToInstance(ProjectDto, project);
  }

  @Query(() => ProjectExportDocumentDto, {
    name: 'exportProjects',
    description: 'export all projects as a versioned JSON document',
  })
  public async exportProjects(): Promise<ProjectExportDocumentDto> {
    const document = await this.projectImportExportService.exportProjects();
    return plainToInstance(ProjectExportDocumentDto, document);
  }

  @Mutation(() => ProjectDto, {
    name: 'createProject',
    description: 'create a new project',
  })
  public async createProject(@Args('input') input: CreateProjectInput): Promise<ProjectDto> {
    const project = await this.projectService.createProject(input);
    return plainToInstance(ProjectDto, project);
  }

  @Mutation(() => ProjectDto, {
    name: 'updateProject',
    description: 'update an existing project',
  })
  public async updateProject(@Args('input') input: UpdateProjectInput): Promise<ProjectDto> {
    const project = await this.projectService.updateProject(input);
    return plainToInstance(ProjectDto, project);
  }

  @Mutation(() => DeleteProjectPayload, {
    name: 'deleteProject',
    description: 'delete a project by public id',
  })
  public async deleteProjectByPublicId(
    @Args('publicId', { type: () => GraphQLUUID }) publicId: string,
  ): Promise<DeleteProjectPayload> {
    const result = await this.projectService.deleteProjectByPublicId(publicId);
    return plainToInstance(DeleteProjectPayload, result);
  }

  @Mutation(() => ImportProjectsPayload, {
    name: 'importProjects',
    description: 'import projects from a versioned JSON document, upserting by publicId or name',
  })
  public async importProjects(@Args('document') document: ImportProjectsInput): Promise<ImportProjectsPayload> {
    const result = await this.projectImportExportService.importProjects(document);
    return plainToInstance(ImportProjectsPayload, {
      importedCount: result.importedCount,
      projects: plainToInstance(ProjectDto, result.projects),
    });
  }
}
