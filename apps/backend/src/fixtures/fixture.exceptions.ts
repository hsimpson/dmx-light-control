import { HttpStatus } from '@nestjs/common';

export abstract class BaseDomainError extends Error {
  // The HTTP status equivalent (useful for federated gateways or tracing)
  public readonly statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;

  // The unique string code your frontend will use for error handling
  public abstract readonly code: string;

  public constructor(message: string) {
    super(message);

    // Ensures the prototype chain is correct for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);

    // Captures a clean stack trace, omitting the constructor call itself
    Error.captureStackTrace(this, this.constructor);
  }
}

export class FixtureNotFoundException extends BaseDomainError {
  public readonly code = 'FIXTURE_NOT_FOUND';
  public override readonly statusCode = HttpStatus.NOT_FOUND;

  public constructor(fixtureId: string) {
    super(`Fixture with ID ${fixtureId} could not be found.`);
    this.name = 'FixtureNotFoundError';
  }
}

export class FixtureCreationFailedException extends BaseDomainError {
  public readonly code = 'FIXTURE_CREATION_FAILED';
  public override readonly statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

  public constructor(fixtureName: string) {
    super(`Failed to create fixture with name ${fixtureName}.`);
    this.name = 'FixtureCreationFailedError';
  }
}

export class FixtureVendorNotFoundException extends BaseDomainError {
  public readonly code = 'VENDOR_NOT_FOUND';
  public override readonly statusCode = HttpStatus.NOT_FOUND;

  public constructor(vendorId: string) {
    super(`Vendor with ID ${vendorId} could not be found.`);
    this.name = 'VendorNotFoundError';
  }
}

export class FixtureVendorAlreadyExistsException extends BaseDomainError {
  public readonly code = 'VENDOR_ALREADY_EXISTS';
  public override readonly statusCode = HttpStatus.CONFLICT;

  public constructor(vendorName: string) {
    super(`Vendor with name ${vendorName} already exists.`);
    this.name = 'VendorAlreadyExistsError';
  }
}

export class FixtureVendorCreationFailedException extends BaseDomainError {
  public readonly code = 'VENDOR_CREATION_FAILED';
  public override readonly statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

  public constructor(vendorName: string) {
    super(`Failed to create vendor with name ${vendorName}.`);
    this.name = 'VendorCreationFailedError';
  }
}

export class ChannelModeNotFoundException extends BaseDomainError {
  public readonly code = 'CHANNEL_MODE_NOT_FOUND';
  public override readonly statusCode = HttpStatus.NOT_FOUND;

  public constructor(channelModeId: string) {
    super(`Channel mode with ID ${channelModeId} could not be found.`);
    this.name = 'ChannelModeNotFoundError';
  }
}

export class ChannelModeAlreadyExistsException extends BaseDomainError {
  public readonly code = 'CHANNEL_MODE_ALREADY_EXISTS';
  public override readonly statusCode = HttpStatus.CONFLICT;

  public constructor(channelModeName: string) {
    super(`Channel mode with name ${channelModeName} already exists.`);
    this.name = 'ChannelModeAlreadyExistsError';
  }
}

export class ChannelDefinitionNotFoundException extends BaseDomainError {
  public readonly code = 'CHANNEL_DEFINITION_NOT_FOUND';
  public override readonly statusCode = HttpStatus.NOT_FOUND;

  public constructor(channelDefinitionId: string) {
    super(`Channel definition with ID ${channelDefinitionId} could not be found.`);
    this.name = 'ChannelDefinitionNotFoundError';
  }
}

export class ChannelDefinitionAlreadyExistsException extends BaseDomainError {
  public readonly code = 'CHANNEL_DEFINITION_ALREADY_EXISTS';
  public override readonly statusCode = HttpStatus.CONFLICT;

  public constructor(channelDefinitionName: string) {
    super(`Channel definition with name ${channelDefinitionName} already exists.`);
    this.name = 'ChannelDefinitionAlreadyExistsError';
  }
}

export class ChannelRangeNotFoundException extends BaseDomainError {
  public readonly code = 'CHANNEL_RANGE_NOT_FOUND';
  public override readonly statusCode = HttpStatus.NOT_FOUND;

  public constructor(channelRangeId: string) {
    super(`Channel range with ID ${channelRangeId} could not be found.`);
    this.name = 'ChannelRangeNotFoundError';
  }
}

export class FixtureImportInvalidException extends BaseDomainError {
  public readonly code = 'FIXTURE_IMPORT_INVALID';
  public override readonly statusCode = HttpStatus.BAD_REQUEST;

  public constructor(message: string) {
    super(message);
    this.name = 'FixtureImportInvalidError';
  }
}

export class FixtureImportConflictException extends BaseDomainError {
  public readonly code = 'FIXTURE_IMPORT_CONFLICT';
  public override readonly statusCode = HttpStatus.CONFLICT;

  public constructor(message: string) {
    super(message);
    this.name = 'FixtureImportConflictError';
  }
}
