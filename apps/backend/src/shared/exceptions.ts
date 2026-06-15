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
