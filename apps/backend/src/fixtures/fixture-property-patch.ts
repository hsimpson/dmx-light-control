import { InferInsertModel } from 'drizzle-orm/table';
import { fixture } from './entities';

export type FixturePropertyPatch = Pick<
  InferInsertModel<typeof fixture>,
  'weight' | 'width' | 'length' | 'height' | 'beamAngle' | 'picturePath' | 'picture2dPath' | 'model3dPath'
>;

export type FixturePropertyInput = {
  weight?: number | null;
  width?: number | null;
  length?: number | null;
  height?: number | null;
  beamAngle?: number;
  picturePath?: string | null;
  picture2dPath?: string | null;
  model3dPath?: string | null;
};

export function fixtureDimensionPatch(input: FixturePropertyInput): Partial<FixturePropertyPatch> {
  const patch: Partial<FixturePropertyPatch> = {};
  if (input.weight !== undefined) {
    patch.weight = input.weight;
  }
  if (input.width !== undefined) {
    patch.width = input.width;
  }
  if (input.length !== undefined) {
    patch.length = input.length;
  }
  if (input.height !== undefined) {
    patch.height = input.height;
  }
  if (input.beamAngle !== undefined) {
    patch.beamAngle = input.beamAngle;
  }
  return patch;
}

export function fixturePropertyPatch(input: FixturePropertyInput): FixturePropertyPatch {
  return {
    ...fixtureDimensionPatch(input),
    weight: input.weight ?? null,
    width: input.width ?? null,
    length: input.length ?? null,
    height: input.height ?? null,
    beamAngle: input.beamAngle ?? 30,
    picturePath: input.picturePath ?? null,
    picture2dPath: input.picture2dPath ?? null,
    model3dPath: input.model3dPath ?? null,
  };
}
