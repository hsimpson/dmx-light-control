export const TRANSFORM_LENGTH = 16;

export function identityTransform(tx = 0, ty = 0, tz = 0): number[] {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, tx, ty, tz, 1];
}

export function defaultTransformForObject(isScalable: boolean, sizeY: number | null): number[] {
  if (isScalable && sizeY !== null) {
    return identityTransform(0, sizeY / 2, 0);
  }
  return identityTransform();
}
