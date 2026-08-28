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

export class ProjectFixtureNotFoundException extends BaseDomainError {
  public readonly code = 'PROJECT_FIXTURE_NOT_FOUND';
  public override readonly statusCode = HttpStatus.NOT_FOUND;

  public constructor(projectFixtureId: string) {
    super(`Project fixture with ID ${projectFixtureId} could not be found.`);
    this.name = 'ProjectFixtureNotFoundError';
  }
}

export class ChannelModeFixtureMismatchException extends BaseDomainError {
  public readonly code = 'CHANNEL_MODE_FIXTURE_MISMATCH';
  public override readonly statusCode = HttpStatus.BAD_REQUEST;

  public constructor() {
    super('The channel mode does not belong to the selected fixture.');
    this.name = 'ChannelModeFixtureMismatchError';
  }
}

export class EmptyChannelModeException extends BaseDomainError {
  public readonly code = 'EMPTY_CHANNEL_MODE';
  public override readonly statusCode = HttpStatus.BAD_REQUEST;

  public constructor() {
    super('The channel mode must have at least one channel assignment.');
    this.name = 'EmptyChannelModeError';
  }
}

export class DmxAddressOutOfRangeException extends BaseDomainError {
  public readonly code = 'DMX_ADDRESS_OUT_OF_RANGE';
  public override readonly statusCode = HttpStatus.BAD_REQUEST;

  public constructor(startAddress: number, channelCount: number) {
    super(`DMX address range ${startAddress}–${startAddress + channelCount - 1} exceeds the 512-channel universe.`);
    this.name = 'DmxAddressOutOfRangeError';
  }
}
