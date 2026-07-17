/// <reference types="vitest/globals" />
import {
  BaseDomainError,
  FixtureNotFoundException,
  FixtureVendorAlreadyExistsException,
  FixtureVendorCreationFailedException,
  FixtureVendorNotFoundException,
} from './fixture.exceptions';
import { HttpStatus } from '@nestjs/common';

describe('fixture exceptions', () => {
  it('BaseDomainError sets INTERNAL_SERVER_ERROR by default', () => {
    const err = new (class extends BaseDomainError {
      public override readonly code = 'TEST';
    })('boom');
    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(err.message).toBe('boom');
  });

  it('FixtureNotFoundException maps to NOT_FOUND with FIXTURE_NOT_FOUND', () => {
    const err = new FixtureNotFoundException('abc');
    expect(err).toBeInstanceOf(BaseDomainError);
    expect(err.code).toBe('FIXTURE_NOT_FOUND');
    expect(err.statusCode).toBe(HttpStatus.NOT_FOUND);
    expect(err.message).toContain('abc');
  });

  it('FixtureVendorNotFoundException maps to NOT_FOUND with VENDOR_NOT_FOUND', () => {
    const err = new FixtureVendorNotFoundException('v1');
    expect(err.code).toBe('VENDOR_NOT_FOUND');
    expect(err.statusCode).toBe(HttpStatus.NOT_FOUND);
  });

  it('FixtureVendorAlreadyExistsException maps to CONFLICT', () => {
    const err = new FixtureVendorAlreadyExistsException('acme');
    expect(err.code).toBe('VENDOR_ALREADY_EXISTS');
    expect(err.statusCode).toBe(HttpStatus.CONFLICT);
  });

  it('FixtureVendorCreationFailedException maps to INTERNAL_SERVER_ERROR', () => {
    const err = new FixtureVendorCreationFailedException('acme');
    expect(err.code).toBe('VENDOR_CREATION_FAILED');
    expect(err.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });
});
