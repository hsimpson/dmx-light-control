import { HttpStatus } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { BaseDomainError } from '@/fixtures/fixture.exceptions';
import {
  ProjectAlreadyExistsException,
  ProjectFixtureAddressOverlapException,
  ProjectImportConflictException,
  ProjectImportInvalidException,
  ProjectNotFoundException,
} from './project.exceptions';

describe('project exceptions', () => {
  it('ProjectNotFoundException maps to NOT_FOUND with PROJECT_NOT_FOUND', () => {
    const err = new ProjectNotFoundException('abc');
    expect(err).toBeInstanceOf(BaseDomainError);
    expect(err.code).toBe('PROJECT_NOT_FOUND');
    expect(err.statusCode).toBe(HttpStatus.NOT_FOUND);
    expect(err.message).toContain('abc');
    expect(err.name).toBe('ProjectNotFoundError');
  });

  it('ProjectAlreadyExistsException maps to CONFLICT', () => {
    const err = new ProjectAlreadyExistsException('show');
    expect(err).toBeInstanceOf(BaseDomainError);
    expect(err.code).toBe('PROJECT_ALREADY_EXISTS');
    expect(err.statusCode).toBe(HttpStatus.CONFLICT);
    expect(err.message).toBe('Project with name show already exists.');
    expect(err.name).toBe('ProjectAlreadyExistsError');
  });

  it('ProjectImportInvalidException maps to BAD_REQUEST', () => {
    const err = new ProjectImportInvalidException('bad document');
    expect(err).toBeInstanceOf(BaseDomainError);
    expect(err.code).toBe('PROJECT_IMPORT_INVALID');
    expect(err.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(err.message).toBe('bad document');
  });

  it('ProjectImportConflictException maps to CONFLICT', () => {
    const err = new ProjectImportConflictException('name clash');
    expect(err).toBeInstanceOf(BaseDomainError);
    expect(err.code).toBe('PROJECT_IMPORT_CONFLICT');
    expect(err.statusCode).toBe(HttpStatus.CONFLICT);
    expect(err.message).toBe('name clash');
  });

  it('ProjectFixtureAddressOverlapException maps to CONFLICT', () => {
    const err = new ProjectFixtureAddressOverlapException(3, 4, 1, 4);
    expect(err).toBeInstanceOf(BaseDomainError);
    expect(err.code).toBe('PROJECT_FIXTURE_ADDRESS_OVERLAP');
    expect(err.statusCode).toBe(HttpStatus.CONFLICT);
    expect(err.message).toBe('DMX address range 3–6 overlaps an existing fixture at 1–4.');
    expect(err.name).toBe('ProjectFixtureAddressOverlapError');
  });
});
