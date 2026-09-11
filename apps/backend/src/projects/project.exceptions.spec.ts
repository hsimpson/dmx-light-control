import { HttpStatus } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { BaseDomainError } from '@/fixtures/fixture.exceptions';
import {
  ChannelModeFixtureMismatchException,
  DmxAddressOutOfRangeException,
  EmptyChannelModeException,
  InvalidProject3dObjectNameException,
  InvalidProject3dObjectSizeException,
  InvalidProject3dObjectTransformException,
  Project3dObjectNameExistsException,
  Project3dObjectNotFoundException,
  ProjectAlreadyExistsException,
  ProjectFixtureAddressOverlapException,
  ProjectFixtureNotFoundException,
  ProjectImportConflictException,
  ProjectImportInvalidException,
  ProjectNotFoundException,
  SceneObjectNotScalableException,
  SceneObjectSizeRequiredException,
  SceneObjectTypeNotFoundException,
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

  it('SceneObjectNotScalableException maps to BAD_REQUEST', () => {
    const err = new SceneObjectNotScalableException();
    expect(err).toBeInstanceOf(BaseDomainError);
    expect(err.code).toBe('SCENE_OBJECT_NOT_SCALABLE');
    expect(err.statusCode).toBe(HttpStatus.BAD_REQUEST);
  });

  it('Project3dObjectNameExistsException maps to CONFLICT', () => {
    const err = new Project3dObjectNameExistsException('Box 1');
    expect(err).toBeInstanceOf(BaseDomainError);
    expect(err.code).toBe('PROJECT_3D_OBJECT_NAME_EXISTS');
    expect(err.statusCode).toBe(HttpStatus.CONFLICT);
    expect(err.message).toBe('Scene object with name Box 1 already exists in this project.');
    expect(err.name).toBe('Project3dObjectNameExistsError');
  });

  it('InvalidProject3dObjectNameException maps to BAD_REQUEST', () => {
    const err = new InvalidProject3dObjectNameException();
    expect(err).toBeInstanceOf(BaseDomainError);
    expect(err.code).toBe('INVALID_PROJECT_3D_OBJECT_NAME');
    expect(err.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(err.message).toBe('Scene object name must be between 1 and 255 characters.');
    expect(err.name).toBe('InvalidProject3dObjectNameError');
  });

  it('ProjectFixtureNotFoundException maps to NOT_FOUND', () => {
    const err = new ProjectFixtureNotFoundException('pf-1');
    expect(err.code).toBe('PROJECT_FIXTURE_NOT_FOUND');
    expect(err.statusCode).toBe(HttpStatus.NOT_FOUND);
    expect(err.message).toContain('pf-1');
  });

  it('SceneObjectTypeNotFoundException maps to NOT_FOUND', () => {
    const err = new SceneObjectTypeNotFoundException('type-1');
    expect(err.code).toBe('SCENE_OBJECT_TYPE_NOT_FOUND');
    expect(err.statusCode).toBe(HttpStatus.NOT_FOUND);
  });

  it('Project3dObjectNotFoundException maps to NOT_FOUND', () => {
    const err = new Project3dObjectNotFoundException('obj-1');
    expect(err.code).toBe('PROJECT_3D_OBJECT_NOT_FOUND');
    expect(err.statusCode).toBe(HttpStatus.NOT_FOUND);
  });

  it('InvalidProject3dObjectTransformException maps to BAD_REQUEST', () => {
    const err = new InvalidProject3dObjectTransformException();
    expect(err.code).toBe('INVALID_PROJECT_3D_OBJECT_TRANSFORM');
    expect(err.statusCode).toBe(HttpStatus.BAD_REQUEST);
  });

  it('InvalidProject3dObjectSizeException maps to BAD_REQUEST', () => {
    const err = new InvalidProject3dObjectSizeException();
    expect(err.code).toBe('INVALID_PROJECT_3D_OBJECT_SIZE');
    expect(err.statusCode).toBe(HttpStatus.BAD_REQUEST);
  });

  it('SceneObjectSizeRequiredException maps to BAD_REQUEST', () => {
    const err = new SceneObjectSizeRequiredException();
    expect(err.code).toBe('SCENE_OBJECT_SIZE_REQUIRED');
    expect(err.statusCode).toBe(HttpStatus.BAD_REQUEST);
  });

  it('ChannelModeFixtureMismatchException maps to BAD_REQUEST', () => {
    const err = new ChannelModeFixtureMismatchException();
    expect(err.code).toBe('CHANNEL_MODE_FIXTURE_MISMATCH');
    expect(err.statusCode).toBe(HttpStatus.BAD_REQUEST);
  });

  it('EmptyChannelModeException maps to BAD_REQUEST', () => {
    const err = new EmptyChannelModeException();
    expect(err.code).toBe('EMPTY_CHANNEL_MODE');
    expect(err.statusCode).toBe(HttpStatus.BAD_REQUEST);
  });

  it('DmxAddressOutOfRangeException maps to BAD_REQUEST', () => {
    const err = new DmxAddressOutOfRangeException(510, 5);
    expect(err.code).toBe('DMX_ADDRESS_OUT_OF_RANGE');
    expect(err.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(err.message).toContain('510');
  });
});
