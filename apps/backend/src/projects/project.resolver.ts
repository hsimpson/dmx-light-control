import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { plainToInstance } from 'class-transformer';
import { GraphQLUUID } from 'graphql-scalars';
import { AddProject3dObjectInput } from './dto/add-project-3d-object.dto';
import { AddProjectFixtureInput } from './dto/add-project-fixture.dto';
import { CreateProjectInput } from './dto/create-project.dto';
import { DeleteProject3dObjectPayload } from './dto/delete-project-3d-object-payload.dto';
import { DeleteProjectFunctionPayload } from './dto/delete-project-function-payload.dto';
import { DeleteProjectFixturePayload } from './dto/delete-project-fixture-payload.dto';
import { DeleteProjectPayload } from './dto/delete-project-payload.dto';
import { ProjectExportDocumentDto } from './dto/export-projects.dto';
import { ImportProjectsInput, ImportProjectsPayload } from './dto/import-projects.dto';
import { Project3dObjectDto } from './dto/project-3d-object.dto';
import { AddProjectFunctionInput, ProjectFunctionDto, UpdateProjectFunctionInput } from './dto/project-function.dto';
import { ProjectFixtureDto } from './dto/project-fixture.dto';
import { ProjectDto } from './dto/project.dto';
import { SceneObjectTypeDto } from './dto/scene-object-type.dto';
import { UpdateProject3dObjectInput } from './dto/update-project-3d-object.dto';
import { UpdateProjectFixtureInput } from './dto/update-project-fixture.dto';
import { UpdateProjectInput } from './dto/update-project.dto';
import { UpdateProjectIoDevicesInput } from './dto/update-project-io-devices.dto';
import { UpdateProjectVirtualConsoleInput } from './dto/virtual-console.dto';
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

  @Query(() => [SceneObjectTypeDto], {
    name: 'sceneObjectTypes',
    description: 'get all scene object types that can be placed in a project',
  })
  public async getSceneObjectTypes(): Promise<SceneObjectTypeDto[]> {
    const types = await this.projectService.getSceneObjectTypes();
    return plainToInstance(SceneObjectTypeDto, types);
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

  @Mutation(() => ProjectDto, {
    name: 'updateProjectVirtualConsole',
    description: 'replace the virtual console layout for a project',
  })
  public async updateProjectVirtualConsole(
    @Args('input') input: UpdateProjectVirtualConsoleInput,
  ): Promise<ProjectDto> {
    const project = await this.projectService.updateProjectVirtualConsole(input);
    return plainToInstance(ProjectDto, project);
  }

  @Mutation(() => ProjectDto, {
    name: 'activateProject',
    description: 'mark a project as the loaded project and connect its input/output devices',
  })
  public async activateProject(@Args('publicId', { type: () => GraphQLUUID }) publicId: string): Promise<ProjectDto> {
    const project = await this.projectService.activateProject(publicId);
    return plainToInstance(ProjectDto, project);
  }

  @Mutation(() => ProjectDto, {
    name: 'updateProjectIoDevices',
    description: 'replace the input/output devices used by a project',
  })
  public async updateProjectIoDevices(@Args('input') input: UpdateProjectIoDevicesInput): Promise<ProjectDto> {
    const project = await this.projectService.updateProjectIoDevices(input);
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
    await this.projectService.refreshActiveProject();
    return plainToInstance(ImportProjectsPayload, {
      importedCount: result.importedCount,
      projects: plainToInstance(ProjectDto, result.projects),
    });
  }

  @Mutation(() => ProjectFixtureDto, {
    name: 'addProjectFixture',
    description: 'add a catalog fixture instance to a project',
  })
  public async addProjectFixture(@Args('input') input: AddProjectFixtureInput): Promise<ProjectFixtureDto> {
    const projectFixture = await this.projectService.addProjectFixture(input);
    return plainToInstance(ProjectFixtureDto, projectFixture);
  }

  @Mutation(() => ProjectFixtureDto, {
    name: 'updateProjectFixture',
    description: 'update a project fixture instance',
  })
  public async updateProjectFixture(@Args('input') input: UpdateProjectFixtureInput): Promise<ProjectFixtureDto> {
    const projectFixture = await this.projectService.updateProjectFixture(input);
    return plainToInstance(ProjectFixtureDto, projectFixture);
  }

  @Mutation(() => DeleteProjectFixturePayload, {
    name: 'deleteProjectFixture',
    description: 'delete a project fixture instance by public id',
  })
  public async deleteProjectFixture(
    @Args('publicId', { type: () => GraphQLUUID }) publicId: string,
  ): Promise<DeleteProjectFixturePayload> {
    const result = await this.projectService.deleteProjectFixtureByPublicId(publicId);
    return plainToInstance(DeleteProjectFixturePayload, result);
  }

  @Mutation(() => Project3dObjectDto, {
    name: 'addProject3dObject',
    description: 'add a scene object instance to a project',
  })
  public async addProject3dObject(@Args('input') input: AddProject3dObjectInput): Promise<Project3dObjectDto> {
    const object = await this.projectService.addProject3dObject(input);
    return plainToInstance(Project3dObjectDto, object);
  }

  @Mutation(() => Project3dObjectDto, {
    name: 'updateProject3dObject',
    description: 'update a project 3D object instance',
  })
  public async updateProject3dObject(@Args('input') input: UpdateProject3dObjectInput): Promise<Project3dObjectDto> {
    const object = await this.projectService.updateProject3dObject(input);
    return plainToInstance(Project3dObjectDto, object);
  }

  @Mutation(() => DeleteProject3dObjectPayload, {
    name: 'deleteProject3dObject',
    description: 'delete a project 3D object instance by public id',
  })
  public async deleteProject3dObject(
    @Args('publicId', { type: () => GraphQLUUID }) publicId: string,
  ): Promise<DeleteProject3dObjectPayload> {
    const result = await this.projectService.deleteProject3dObjectByPublicId(publicId);
    return plainToInstance(DeleteProject3dObjectPayload, result);
  }

  @Mutation(() => ProjectFunctionDto, {
    name: 'addProjectFunction',
    description: 'add a function to a project',
  })
  public async addProjectFunction(@Args('input') input: AddProjectFunctionInput): Promise<ProjectFunctionDto> {
    const projectFunction = await this.projectService.addProjectFunction(input);
    return plainToInstance(ProjectFunctionDto, projectFunction);
  }

  @Mutation(() => ProjectFunctionDto, {
    name: 'updateProjectFunction',
    description: 'update a project function',
  })
  public async updateProjectFunction(@Args('input') input: UpdateProjectFunctionInput): Promise<ProjectFunctionDto> {
    const projectFunction = await this.projectService.updateProjectFunction(input);
    return plainToInstance(ProjectFunctionDto, projectFunction);
  }

  @Mutation(() => DeleteProjectFunctionPayload, {
    name: 'deleteProjectFunction',
    description: 'delete a project function by public id and remove it from virtual console buttons',
  })
  public async deleteProjectFunction(
    @Args('publicId', { type: () => GraphQLUUID }) publicId: string,
  ): Promise<DeleteProjectFunctionPayload> {
    const result = await this.projectService.deleteProjectFunctionByPublicId(publicId);
    return plainToInstance(DeleteProjectFunctionPayload, result);
  }
}
