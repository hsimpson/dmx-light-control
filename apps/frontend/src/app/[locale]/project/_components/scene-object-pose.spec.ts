import { describe, expect, it } from 'vitest';
import { Group, Mesh } from 'three';
import {
  applyTransformMatrix,
  applyVisualSize,
  bakeInstancePose,
  composeTransformFromPose,
  decomposePose,
} from './scene-object-pose';

describe('scene-object-pose', () => {
  it('applies a column-major transform onto position', () => {
    const object = new Group();
    const transform = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 2, 0.25, 3, 1];
    applyTransformMatrix(object, transform);
    expect(object.position.x).toBe(2);
    expect(object.position.y).toBe(0.25);
    expect(object.position.z).toBe(3);
  });

  it('bakes gizmo scale into size and resets object scale', () => {
    const object = new Group();
    const visual = new Mesh();
    applyVisualSize(visual, { sizeX: 2, sizeY: 0.5, sizeZ: 1 });
    object.scale.set(2, 2, 2);

    const baked = bakeInstancePose(object, visual, true);
    expect(baked.sizeX).toBe(4);
    expect(baked.sizeY).toBe(1);
    expect(baked.sizeZ).toBe(2);
    expect(object.scale.x).toBe(1);
    expect(baked.transform[0]).toBe(1);
    expect(baked.transform[5]).toBe(1);
    expect(baked.transform[10]).toBe(1);
  });

  it('clears size when baking a non-scalable object', () => {
    const object = new Group();
    const visual = new Mesh();
    const baked = bakeInstancePose(object, visual, false);
    expect(baked.sizeX).toBeNull();
    expect(baked.sizeY).toBeNull();
    expect(baked.sizeZ).toBeNull();
  });

  it('decomposes identity translation into zeros', () => {
    const pose = decomposePose([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    expect(pose.positionX).toBeCloseTo(0);
    expect(pose.positionY).toBeCloseTo(0);
    expect(pose.positionZ).toBeCloseTo(0);
    expect(pose.rotationX).toBeCloseTo(0);
    expect(pose.rotationY).toBeCloseTo(0);
    expect(pose.rotationZ).toBeCloseTo(0);
  });

  it('round-trips a known translation and XYZ euler', () => {
    const composed = composeTransformFromPose({
      positionX: 1,
      positionY: 2,
      positionZ: 3,
      rotationX: 10,
      rotationY: 20,
      rotationZ: 30,
    });
    const pose = decomposePose(composed);
    expect(pose.positionX).toBeCloseTo(1);
    expect(pose.positionY).toBeCloseTo(2);
    expect(pose.positionZ).toBeCloseTo(3);
    expect(pose.rotationX).toBeCloseTo(10);
    expect(pose.rotationY).toBeCloseTo(20);
    expect(pose.rotationZ).toBeCloseTo(30);
  });
});
