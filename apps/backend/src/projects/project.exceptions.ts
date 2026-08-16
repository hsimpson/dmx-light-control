import { BaseDomainError } from '@/fixtures/fixture.exceptions';
import { HttpStatus } from '@nestjs/common';

export class ProjectNotFoundException extends BaseDomainError {
  public readonly code = 'PROJECT_NOT_FOUND';
  public override readonly statusCode = HttpStatus.NOT_FOUND;

  public constructor(projectId: string) {
    super(`Project with ID ${projectId} could not be found.`);
    this.name = 'ProjectNotFoundError';
  }
}

export class ProjectAlreadyExistsException extends BaseDomainError {
  public readonly code = 'PROJECT_ALREADY_EXISTS';
  public override readonly statusCode = HttpStatus.CONFLICT;

  public constructor(projectName: string) {
    super(`Project with name ${projectName} already exists.`);
    this.name = 'ProjectAlreadyExistsError';
  }
}

export class ProjectImportInvalidException extends BaseDomainError {
  public readonly code = 'PROJECT_IMPORT_INVALID';
  public override readonly statusCode = HttpStatus.BAD_REQUEST;

  public constructor(message: string) {
    super(message);
    this.name = 'ProjectImportInvalidError';
  }
}

export class ProjectImportConflictException extends BaseDomainError {
  public readonly code = 'PROJECT_IMPORT_CONFLICT';
  public override readonly statusCode = HttpStatus.CONFLICT;

  public constructor(message: string) {
    super(message);
    this.name = 'ProjectImportConflictError';
  }
}
