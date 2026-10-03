import { describe, expect, it } from 'vitest';
import { nextUniqueSceneObjectName, normalizeSceneObjectName } from './project-3d-object-name';
import { InvalidProject3dObjectNameException } from './project.exceptions';

describe('nextUniqueSceneObjectName', () => {
  it('uses Box 1 when the project has no objects', () => {
    expect(nextUniqueSceneObjectName('Box', 0, [])).toBe('Box 1');
  });

  it('uses Light stand 1 independently of boxes', () => {
    expect(nextUniqueSceneObjectName('Light stand', 0, ['Box 1'])).toBe('Light stand 1');
  });

  it('starts n at type count plus one', () => {
    expect(nextUniqueSceneObjectName('Box', 1, ['Stage'])).toBe('Box 2');
  });

  it('skips a taken default', () => {
    expect(nextUniqueSceneObjectName('Box', 1, ['Box 2'])).toBe('Box 3');
  });
});

describe('normalizeSceneObjectName', () => {
  it('trims a usable name', () => {
    expect(normalizeSceneObjectName('  Box 1  ')).toBe('Box 1');
  });

  it('rejects an empty name and a name longer than 255 characters', () => {
    expect(() => normalizeSceneObjectName('   ')).toThrow(InvalidProject3dObjectNameException);
    expect(() => normalizeSceneObjectName('x'.repeat(256))).toThrow(InvalidProject3dObjectNameException);
  });
});
