import { Box3, BoxGeometry, Group, LineBasicMaterial, Mesh, Scene, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  SELECTION_AABB_MIN_PADDING_METERS,
  SELECTION_AABB_PADDING_FRACTION,
  SELECTION_HIGHLIGHT_COLOR,
  SelectionBoxHighlighter,
  createSelectionBoxHelper,
  expandWorldAabb,
  paddingForWorldAabb,
  setPaddedWorldAabbFromObject,
} from './selection-bounding-box';

describe('paddingForWorldAabb', () => {
  it('uses a fraction of the longest side, not less than the minimum gap', () => {
    const meterBox = new Box3(new Vector3(0, 0, 0), new Vector3(1, 1, 1));
    expect(paddingForWorldAabb(meterBox)).toBe(SELECTION_AABB_PADDING_FRACTION);

    const tiny = new Box3(new Vector3(0, 0, 0), new Vector3(0.01, 0.01, 0.01));
    expect(paddingForWorldAabb(tiny)).toBe(SELECTION_AABB_MIN_PADDING_METERS);
  });
});

describe('expandWorldAabb', () => {
  it('returns a larger copy on every axis without mutating the source', () => {
    const source = new Box3(new Vector3(0, 0, 0), new Vector3(2, 1, 0.5));
    const expanded = expandWorldAabb(source);
    const pad = paddingForWorldAabb(source);

    expect(expanded).not.toBe(source);
    expect(source.min).toEqual(new Vector3(0, 0, 0));
    expect(source.max).toEqual(new Vector3(2, 1, 0.5));
    expect(expanded.min.x).toBeCloseTo(-pad);
    expect(expanded.min.y).toBeCloseTo(-pad);
    expect(expanded.min.z).toBeCloseTo(-pad);
    expect(expanded.max.x).toBeCloseTo(2 + pad);
    expect(expanded.max.y).toBeCloseTo(1 + pad);
    expect(expanded.max.z).toBeCloseTo(0.5 + pad);
  });

  it('leaves an empty box empty', () => {
    const empty = new Box3();
    expect(empty.isEmpty()).toBe(true);
    const expanded = expandWorldAabb(empty);
    expect(expanded.isEmpty()).toBe(true);
  });
});

describe('setPaddedWorldAabbFromObject', () => {
  it('writes the padded world AABB of a mesh into the target box', () => {
    const object = new Group();
    object.add(new Mesh(new BoxGeometry(1, 1, 1)));
    object.position.set(4, 0, 0);
    object.updateMatrixWorld(true);

    const target = new Box3();
    expect(setPaddedWorldAabbFromObject(object, target)).toBe(true);
    const unpadded = new Box3().setFromObject(object);
    const pad = paddingForWorldAabb(unpadded);
    expect(target.min.x).toBeCloseTo(unpadded.min.x - pad);
    expect(target.max.x).toBeCloseTo(unpadded.max.x + pad);
  });

  it('does not grow the AABB to include a beam child', () => {
    const object = new Group();
    object.add(new Mesh(new BoxGeometry(0.2, 0.2, 0.2)));
    const beam = new Mesh(new BoxGeometry(6, 2, 2));
    beam.userData.isBeam = true;
    beam.position.set(3, 0, 0);
    object.add(beam);
    object.updateMatrixWorld(true);

    const target = new Box3();
    expect(setPaddedWorldAabbFromObject(object, target)).toBe(true);
    expect(target.max.x).toBeLessThan(1);
  });
});

describe('createSelectionBoxHelper', () => {
  it('builds a yellow unpickable Box3Helper', () => {
    const box = new Box3(new Vector3(-1, -1, -1), new Vector3(1, 1, 1));
    const helper = createSelectionBoxHelper(box);
    expect(helper.userData.isSelectionHighlight).toBe(true);
    expect(helper.type).toBe('Box3Helper');
    expect(helper.material).toBeInstanceOf(LineBasicMaterial);
    const material = helper.material as LineBasicMaterial;
    expect(material.color.getHex()).toBe(SELECTION_HIGHLIGHT_COLOR);
    expect(SELECTION_HIGHLIGHT_COLOR).toBe(0xffff00);

    const intersections: unknown[] = [];
    helper.raycast({} as never, intersections as never);
    expect(intersections).toEqual([]);
  });
});

describe('SelectionBoxHighlighter', () => {
  it('parents helpers to the scene, not the selected object, and removes them on dispose', () => {
    const scene = new Scene();
    const highlighter = new SelectionBoxHighlighter(scene);
    const object = new Group();
    object.add(new Mesh(new BoxGeometry(1, 1, 1)));
    object.position.set(2, 0, 0);
    object.updateMatrixWorld(true);

    highlighter.setTargets([object]);
    const helper = scene.children.find(child => child.userData.isSelectionHighlight);
    expect(helper).toBeDefined();
    expect(helper?.parent).toBe(scene);
    expect(object.children.some(child => child.userData.isSelectionHighlight)).toBe(false);

    highlighter.dispose();
    expect(scene.children.some(child => child.userData.isSelectionHighlight)).toBe(false);
  });
});
