import { Box3, type Object3D, type Ray, Vector3 } from 'three';

const PICK_PADDING_METERS = 0.15;

export function pickClosestObjectByBoundingBox(ray: Ray, objects: Object3D[]): Object3D | undefined {
  const box = new Box3();
  const hitPoint = new Vector3();
  let closest: Object3D | undefined;
  let closestDistanceSq = Number.POSITIVE_INFINITY;

  for (const object of objects) {
    box.setFromObject(object);
    if (box.isEmpty()) {
      continue;
    }
    box.expandByScalar(PICK_PADDING_METERS);
    const hit = ray.intersectBox(box, hitPoint);
    if (!hit) {
      continue;
    }
    const distanceSq = ray.origin.distanceToSquared(hit);
    if (distanceSq < closestDistanceSq) {
      closestDistanceSq = distanceSq;
      closest = object;
    }
  }

  return closest;
}
