import { describe, it, expect } from 'vitest';
import { HttpStatus } from '@nestjs/common';
import {
  BaseDomainError,
  ChannelDefinitionNotFoundException,
  ChannelModeAlreadyExistsException,
  ChannelModeNotFoundException,
  FixtureNotFoundException,
  FixtureVendorAlreadyExistsException,
  FixtureVendorCreationFailedException,
  FixtureVendorNotFoundException,
} from './fixture.exceptions';

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

  it('ChannelModeNotFoundException maps to NOT_FOUND with CHANNEL_MODE_NOT_FOUND', () => {
    const err = new ChannelModeNotFoundException('mode-1');
    expect(err.code).toBe('CHANNEL_MODE_NOT_FOUND');
    expect(err.statusCode).toBe(HttpStatus.NOT_FOUND);
    expect(err.message).toContain('mode-1');
  });

  it('ChannelModeAlreadyExistsException maps to CONFLICT', () => {
    const err = new ChannelModeAlreadyExistsException('4 channel mode');
    expect(err.code).toBe('CHANNEL_MODE_ALREADY_EXISTS');
    expect(err.statusCode).toBe(HttpStatus.CONFLICT);
    expect(err.message).toContain('4 channel mode');
  });

  it('ChannelDefinitionNotFoundException maps to NOT_FOUND with CHANNEL_DEFINITION_NOT_FOUND', () => {
    const err = new ChannelDefinitionNotFoundException('def-1');
    expect(err.code).toBe('CHANNEL_DEFINITION_NOT_FOUND');
    expect(err.statusCode).toBe(HttpStatus.NOT_FOUND);
    expect(err.message).toContain('def-1');
  });
});
