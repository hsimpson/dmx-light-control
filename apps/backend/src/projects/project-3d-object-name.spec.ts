import { describe, expect, it } from 'vitest';
import { nextUniqueSceneObjectName } from './project-3d-object-name';

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
