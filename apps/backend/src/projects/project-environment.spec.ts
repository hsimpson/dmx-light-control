import { describe, expect, it } from 'vitest';
import { environmentTypeForImport, optionalEnvironmentType, ProjectEnvironmentType } from './project-environment';

describe('optionalEnvironmentType', () => {
  it('omits keys that are undefined', () => {
    expect(optionalEnvironmentType({})).toEqual({});
    expect(optionalEnvironmentType({ environmentType: ProjectEnvironmentType.SimpleGround })).toEqual({
      environmentType: ProjectEnvironmentType.SimpleGround,
    });
  });
});

describe('environmentTypeForImport', () => {
  it('defaults omitted values to Room so older exports keep walls', () => {
    expect(environmentTypeForImport()).toBe(ProjectEnvironmentType.Room);
    expect(environmentTypeForImport(undefined)).toBe(ProjectEnvironmentType.Room);
  });

  it('honors an explicit SimpleGround value', () => {
    expect(environmentTypeForImport(ProjectEnvironmentType.SimpleGround)).toBe(ProjectEnvironmentType.SimpleGround);
  });
});
