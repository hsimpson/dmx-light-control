import { describe, expect, it } from 'vitest';
import { BoxGeometry, Group, Mesh, Ray, Vector3 } from 'three';
import { pickClosestObjectByBoundingBox } from './scene-object-pick';

describe('pickClosestObjectByBoundingBox', () => {
  it('selects an object when the ray hits its bounding box', () => {
    const object = new Group();
    const mesh = new Mesh(new BoxGeometry(0.05, 2, 0.05));
    object.add(mesh);
    object.position.set(0, 1, -4);
    object.updateMatrixWorld(true);

    const ray = new Ray(new Vector3(0, 1, 0), new Vector3(0, 0, -1));
    expect(pickClosestObjectByBoundingBox(ray, [object])).toBe(object);
  });

  it('picks the closer of two bounding boxes', () => {
    const near = new Group();
    near.add(new Mesh(new BoxGeometry(1, 1, 1)));
    near.position.set(0, 0, -2);
    near.updateMatrixWorld(true);

    const far = new Group();
    far.add(new Mesh(new BoxGeometry(1, 1, 1)));
    far.position.set(0, 0, -8);
    far.updateMatrixWorld(true);

    const ray = new Ray(new Vector3(0, 0, 0), new Vector3(0, 0, -1));
    expect(pickClosestObjectByBoundingBox(ray, [far, near])).toBe(near);
  });

  it('hits a thin stand when the ray is just outside the mesh AABB', () => {
    const object = new Group();
    object.add(new Mesh(new BoxGeometry(0.05, 2, 0.05)));
    object.position.set(0, 1, -4);
    object.updateMatrixWorld(true);

    const ray = new Ray(new Vector3(0.1, 1, 0), new Vector3(0, 0, -1));
    expect(pickClosestObjectByBoundingBox(ray, [object])).toBe(object);
  });

  it('returns undefined when the ray misses', () => {
    const object = new Group();
    object.add(new Mesh(new BoxGeometry(1, 1, 1)));
    object.position.set(10, 10, -4);
    object.updateMatrixWorld(true);

    const ray = new Ray(new Vector3(0, 0, 0), new Vector3(0, 0, -1));
    expect(pickClosestObjectByBoundingBox(ray, [object])).toBeUndefined();
  });
});
