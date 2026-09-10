import { TRANSFORM_LENGTH } from '@/projects/project-3d-object.transform';
import {
  InvalidProject3dObjectSizeException,
  InvalidProject3dObjectTransformException,
  SceneObjectNotScalableException,
  SceneObjectSizeRequiredException,
} from '@/projects/project.exceptions';
import { ROOM_DIMENSION_MAX, ROOM_DIMENSION_MIN } from '@/projects/project-room-dimensions';

export type SceneObjectSizeInput = {
  sizeX?: number | null;
  sizeY?: number | null;
  sizeZ?: number | null;
};

export type ResolvedSceneObjectSizes = {
  sizeX: number | null;
  sizeY: number | null;
  sizeZ: number | null;
};

function isPresent(value: number | null | undefined): value is number {
  return value !== undefined && value !== null;
}

function assertSizeBounds(value: number): void {
  if (!Number.isFinite(value) || value < ROOM_DIMENSION_MIN || value > ROOM_DIMENSION_MAX) {
    throw new InvalidProject3dObjectSizeException();
  }
}

export function assertValidTransform(transform: number[]): void {
  if (transform.length !== TRANSFORM_LENGTH || transform.some(value => !Number.isFinite(value))) {
    throw new InvalidProject3dObjectTransformException();
  }
}

export function resolveSizesForType(
  isScalable: boolean,
  sizes: SceneObjectSizeInput,
  defaults: { sizeX: number; sizeY: number; sizeZ: number },
  existing?: ResolvedSceneObjectSizes,
): ResolvedSceneObjectSizes {
  const provided = isPresent(sizes.sizeX) || isPresent(sizes.sizeY) || isPresent(sizes.sizeZ);
  if (!isScalable) {
    if (provided) {
      throw new SceneObjectNotScalableException();
    }
    return { sizeX: null, sizeY: null, sizeZ: null };
  }

  const sizeX = sizes.sizeX === undefined ? (existing?.sizeX ?? defaults.sizeX) : sizes.sizeX;
  const sizeY = sizes.sizeY === undefined ? (existing?.sizeY ?? defaults.sizeY) : sizes.sizeY;
  const sizeZ = sizes.sizeZ === undefined ? (existing?.sizeZ ?? defaults.sizeZ) : sizes.sizeZ;

  if (sizeX === null || sizeY === null || sizeZ === null) {
    throw new SceneObjectSizeRequiredException();
  }

  assertSizeBounds(sizeX);
  assertSizeBounds(sizeY);
  assertSizeBounds(sizeZ);

  return { sizeX, sizeY, sizeZ };
}
