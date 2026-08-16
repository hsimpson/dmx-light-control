import { Injectable } from '@nestjs/common';
import { CreateProjectInput } from './dto/create-project.dto';
import { UpdateProjectInput } from './dto/update-project.dto';
import { ProjectAlreadyExistsException, ProjectNotFoundException } from './project.exceptions';
import { ProjectRepository } from './repositories/project.repository';

function getErrorCode(error: unknown): unknown {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }
  return error.code;
}

function isPostgresUniqueViolation(error: unknown): boolean {
  if (getErrorCode(error) === '23505') {
    return true;
  }
  if (typeof error === 'object' && error !== null && 'cause' in error) {
    return getErrorCode(error.cause) === '23505';
  }
  return false;
}

@Injectable()
export class ProjectService {
  public constructor(private readonly projectRepository: ProjectRepository) {}

  public async getAllProjects() {
    return this.projectRepository.findMany();
  }

  public async getProjectByPublicId(publicId: string) {
    return this.projectRepository.findOneByPublicId(publicId);
  }

  public async createProject(input: CreateProjectInput) {
    try {
      return await this.projectRepository.createOne(input);
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        throw new ProjectAlreadyExistsException(input.name);
      }
      throw error;
    }
  }

  public async updateProject(input: UpdateProjectInput) {
    try {
      const updated = await this.projectRepository.updateOneByPublicId(input.publicId, { name: input.name });
      if (!updated) {
        throw new ProjectNotFoundException(input.publicId);
      }
      return updated;
    } catch (error) {
      if (error instanceof ProjectNotFoundException) {
        throw error;
      }
      if (isPostgresUniqueViolation(error)) {
        throw new ProjectAlreadyExistsException(input.name);
      }
      throw error;
    }
  }

  public async deleteProjectByPublicId(publicId: string): Promise<{ publicId: string; deleted: boolean }> {
    const deleted = await this.projectRepository.deleteOneByPublicId(publicId);
    return { publicId, deleted };
  }
}
