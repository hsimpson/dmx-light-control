import { Box3, type Object3D, type Ray, type Raycaster, Vector3 } from 'three';
import { isFixtureBeam, setWorldAabbIgnoringBeams } from './selection-bounding-box';

const PICK_PADDING_METERS = 0.15;

export function isSelectionHighlight(object: Object3D): boolean {
  return object.userData.isSelectionHighlight === true;
}

export function pickClosestObjectByBoundingBox(ray: Ray, objects: Object3D[]): Object3D | undefined {
  const box = new Box3();
  const hitPoint = new Vector3();
  let closest: Object3D | undefined;
  let closestDistanceSq = Number.POSITIVE_INFINITY;

  for (const object of objects) {
    if (isSelectionHighlight(object)) {
      continue;
    }
    box.makeEmpty();
    setWorldAabbIgnoringBeams(object, box);
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

function findPickRoot(object: Object3D, roots: ReadonlySet<Object3D>): Object3D | undefined {
  let current: Object3D | null = object;
  while (current) {
    if (roots.has(current)) {
      return current;
    }
    current = current.parent;
  }
  return undefined;
}

export function pickClosestSceneObject(raycaster: Raycaster, objects: Object3D[]): Object3D | undefined {
  const roots = new Set(objects);
  const meshHits = raycaster.intersectObjects(objects, true);
  for (const hit of meshHits) {
    if (isSelectionHighlight(hit.object) || isFixtureBeam(hit.object)) {
      continue;
    }
    const root = findPickRoot(hit.object, roots);
    if (root && !isSelectionHighlight(root)) {
      return root;
    }
  }
  return pickClosestObjectByBoundingBox(raycaster.ray, objects);
}
