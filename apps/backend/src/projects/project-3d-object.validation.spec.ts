import { describe, expect, it } from 'vitest';
import { identityTransform } from './project-3d-object.transform';
import { assertValidTransform, resolveSizesForType } from './project-3d-object.validation';
import {
  InvalidProject3dObjectSizeException,
  InvalidProject3dObjectTransformException,
  SceneObjectNotScalableException,
  SceneObjectSizeRequiredException,
} from './project.exceptions';

const defaults = { sizeX: 2, sizeY: 0.5, sizeZ: 1 };

describe('assertValidTransform', () => {
  it('accepts a 16-value identity matrix', () => {
    expect(() => {
      assertValidTransform(identityTransform());
    }).not.toThrow();
  });

  it('rejects the wrong length', () => {
    expect(() => {
      assertValidTransform([1, 0, 0, 1]);
    }).toThrow(InvalidProject3dObjectTransformException);
  });

  it('rejects non-finite values', () => {
    const transform = identityTransform();
    transform[12] = Number.NaN;
    expect(() => {
      assertValidTransform(transform);
    }).toThrow(InvalidProject3dObjectTransformException);
  });
});

describe('resolveSizesForType', () => {
  it('uses defaults for scalable types when sizes are omitted', () => {
    expect(resolveSizesForType(true, {}, defaults)).toEqual(defaults);
  });

  it('rejects sizes on non-scalable types', () => {
    expect(() => {
      resolveSizesForType(false, { sizeX: 1 }, defaults);
    }).toThrow(SceneObjectNotScalableException);
  });

  it('returns null sizes for non-scalable types', () => {
    expect(resolveSizesForType(false, {}, defaults)).toEqual({ sizeX: null, sizeY: null, sizeZ: null });
  });

  it('rejects out-of-range sizes', () => {
    expect(() => {
      resolveSizesForType(true, { sizeX: 0.01, sizeY: 1, sizeZ: 1 }, defaults);
    }).toThrow(InvalidProject3dObjectSizeException);
  });

  it('rejects null sizes on scalable types', () => {
    expect(() => {
      resolveSizesForType(true, { sizeX: null }, defaults);
    }).toThrow(SceneObjectSizeRequiredException);
  });
});
