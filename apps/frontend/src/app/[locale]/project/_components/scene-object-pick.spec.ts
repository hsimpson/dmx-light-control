import { BoxGeometry, Group, Mesh, Ray, Raycaster, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { pickClosestObjectByBoundingBox, pickClosestSceneObject } from './scene-object-pick';

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

  it('skips objects with an empty bounding box', () => {
    const empty = new Group();
    empty.updateMatrixWorld(true);
    const mesh = new Group();
    mesh.add(new Mesh(new BoxGeometry(1, 1, 1)));
    mesh.position.set(0, 0, -2);
    mesh.updateMatrixWorld(true);

    const ray = new Ray(new Vector3(0, 0, 0), new Vector3(0, 0, -1));
    expect(pickClosestObjectByBoundingBox(ray, [empty, mesh])).toBe(mesh);
  });
});

describe('pickClosestSceneObject', () => {
  it('prefers a mesh hit over a closer padded bounding box', () => {
    const stand = new Group();
    stand.add(new Mesh(new BoxGeometry(0.05, 2, 0.05)));
    stand.position.set(0, 1, -2);
    stand.updateMatrixWorld(true);

    const fixture = new Group();
    fixture.add(new Mesh(new BoxGeometry(0.2, 0.2, 0.2)));
    fixture.position.set(0.12, 1, -4);
    fixture.updateMatrixWorld(true);

    const ray = new Ray(new Vector3(0.12, 1, 0), new Vector3(0, 0, -1));
    const raycaster = new Raycaster();
    raycaster.ray.copy(ray);
    expect(pickClosestObjectByBoundingBox(ray, [stand, fixture])).toBe(stand);
    expect(pickClosestSceneObject(raycaster, [stand, fixture])).toBe(fixture);
  });

  it('falls back to the padded bounding box when the ray misses every mesh', () => {
    const object = new Group();
    object.add(new Mesh(new BoxGeometry(0.05, 2, 0.05)));
    object.position.set(0, 1, -4);
    object.updateMatrixWorld(true);

    const ray = new Ray(new Vector3(0.1, 1, 0), new Vector3(0, 0, -1));
    const raycaster = new Raycaster();
    raycaster.ray.copy(ray);
    expect(pickClosestSceneObject(raycaster, [object])).toBe(object);
  });
});
