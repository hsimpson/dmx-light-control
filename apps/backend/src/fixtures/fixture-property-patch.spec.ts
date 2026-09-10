import { describe, expect, it } from 'vitest';
import { fixtureDimensionPatch, fixturePropertyPatch } from './fixture-property-patch';

describe('fixtureDimensionPatch', () => {
  it('omits unspecified dimensions', () => {
    expect(fixtureDimensionPatch({ weight: 4.2 })).toEqual({ weight: 4.2 });
  });

  it('allows clearing a dimension with null', () => {
    expect(fixtureDimensionPatch({ width: null })).toEqual({ width: null });
  });
});

describe('fixturePropertyPatch', () => {
  it('treats omitted import fields as null', () => {
    expect(fixturePropertyPatch({ weight: 1 })).toEqual({
      weight: 1,
      width: null,
      length: null,
      height: null,
      picturePath: null,
      picture2dPath: null,
      model3dPath: null,
    });
  });
});
