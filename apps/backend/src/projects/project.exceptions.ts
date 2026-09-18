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

export class SceneObjectTypeNotFoundException extends BaseDomainError {
  public readonly code = 'SCENE_OBJECT_TYPE_NOT_FOUND';
  public override readonly statusCode = HttpStatus.NOT_FOUND;

  public constructor(sceneObjectTypeId: string) {
    super(`Scene object type with ID ${sceneObjectTypeId} could not be found.`);
    this.name = 'SceneObjectTypeNotFoundError';
  }
}

export class Project3dObjectNotFoundException extends BaseDomainError {
  public readonly code = 'PROJECT_3D_OBJECT_NOT_FOUND';
  public override readonly statusCode = HttpStatus.NOT_FOUND;

  public constructor(project3dObjectId: string) {
    super(`Project 3D object with ID ${project3dObjectId} could not be found.`);
    this.name = 'Project3dObjectNotFoundError';
  }
}

export class Project3dObjectNameExistsException extends BaseDomainError {
  public readonly code = 'PROJECT_3D_OBJECT_NAME_EXISTS';
  public override readonly statusCode = HttpStatus.CONFLICT;

  public constructor(name: string) {
    super(`Scene object with name ${name} already exists in this project.`);
    this.name = 'Project3dObjectNameExistsError';
  }
}

export class InvalidProject3dObjectNameException extends BaseDomainError {
  public readonly code = 'INVALID_PROJECT_3D_OBJECT_NAME';
  public override readonly statusCode = HttpStatus.BAD_REQUEST;

  public constructor() {
    super('Scene object name must be between 1 and 255 characters.');
    this.name = 'InvalidProject3dObjectNameError';
  }
}

export class InvalidProject3dObjectTransformException extends BaseDomainError {
  public readonly code = 'INVALID_PROJECT_3D_OBJECT_TRANSFORM';
  public override readonly statusCode = HttpStatus.BAD_REQUEST;

  public constructor() {
    super('Transform must be 16 finite numbers (column-major 4×4 matrix).');
    this.name = 'InvalidProject3dObjectTransformError';
  }
}

export class InvalidProject3dObjectSizeException extends BaseDomainError {
  public readonly code = 'INVALID_PROJECT_3D_OBJECT_SIZE';
  public override readonly statusCode = HttpStatus.BAD_REQUEST;

  public constructor() {
    super('Object size must be between 0.1 and 200 meters.');
    this.name = 'InvalidProject3dObjectSizeError';
  }
}

export class SceneObjectNotScalableException extends BaseDomainError {
  public readonly code = 'SCENE_OBJECT_NOT_SCALABLE';
  public override readonly statusCode = HttpStatus.BAD_REQUEST;

  public constructor() {
    super('This scene object type has a fixed size and cannot be scaled.');
    this.name = 'SceneObjectNotScalableError';
  }
}

export class SceneObjectSizeRequiredException extends BaseDomainError {
  public readonly code = 'SCENE_OBJECT_SIZE_REQUIRED';
  public override readonly statusCode = HttpStatus.BAD_REQUEST;

  public constructor() {
    super('Scalable scene objects require sizeX, sizeY, and sizeZ.');
    this.name = 'SceneObjectSizeRequiredError';
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

export class ProjectFixtureAddressOverlapException extends BaseDomainError {
  public readonly code = 'PROJECT_FIXTURE_ADDRESS_OVERLAP';
  public override readonly statusCode = HttpStatus.CONFLICT;

  public constructor(startAddress: number, channelCount: number, otherStartAddress: number, otherChannelCount: number) {
    super(
      `DMX address range ${startAddress}–${startAddress + channelCount - 1} overlaps an existing fixture at ${otherStartAddress}–${otherStartAddress + otherChannelCount - 1}.`,
    );
    this.name = 'ProjectFixtureAddressOverlapError';
  }
}

export class InvalidVirtualConsoleException extends BaseDomainError {
  public readonly code = 'INVALID_VIRTUAL_CONSOLE';
  public override readonly statusCode = HttpStatus.BAD_REQUEST;

  public constructor(message: string) {
    super(message);
    this.name = 'InvalidVirtualConsoleError';
  }
}
