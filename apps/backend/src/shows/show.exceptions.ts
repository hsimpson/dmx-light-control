import { BaseDomainError } from '@/fixtures/fixture.exceptions';
import { HttpStatus } from '@nestjs/common';

export class ShowNotFoundException extends BaseDomainError {
  public readonly code = 'SHOW_NOT_FOUND';
  public override readonly statusCode = HttpStatus.NOT_FOUND;

  public constructor(showId: string) {
    super(`Show with ID ${showId} could not be found.`);
    this.name = 'ShowNotFoundError';
  }
}

export class ShowNameExistsException extends BaseDomainError {
  public readonly code = 'SHOW_NAME_EXISTS';
  public override readonly statusCode = HttpStatus.CONFLICT;

  public constructor(name: string) {
    super(`Show with name ${name} already exists in this project.`);
    this.name = 'ShowNameExistsError';
  }
}

export class InvalidShowException extends BaseDomainError {
  public readonly code = 'SHOW_INVALID';
  public override readonly statusCode = HttpStatus.BAD_REQUEST;

  public constructor(message: string) {
    super(message);
    this.name = 'InvalidShowError';
  }
}
