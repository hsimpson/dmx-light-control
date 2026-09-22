import { Box3, Box3Helper, type LineBasicMaterial, type Object3D, type Scene, Vector3 } from 'three';

export const SELECTION_HIGHLIGHT_COLOR = 0xffff00;
export const SELECTION_AABB_PADDING_FRACTION = 0.03;
export const SELECTION_AABB_MIN_PADDING_METERS = 0.02;

export function paddingForWorldAabb(box: Box3): number {
  const size = box.getSize(new Vector3());
  const maxExtent = Math.max(size.x, size.y, size.z);
  return Math.max(SELECTION_AABB_MIN_PADDING_METERS, maxExtent * SELECTION_AABB_PADDING_FRACTION);
}

export function expandWorldAabb(box: Box3): Box3 {
  const target = box.clone();
  if (target.isEmpty()) {
    return target;
  }
  return target.expandByScalar(paddingForWorldAabb(box));
}

export function setPaddedWorldAabbFromObject(object: Object3D, target: Box3): boolean {
  target.setFromObject(object);
  if (target.isEmpty()) {
    return false;
  }
  target.expandByScalar(paddingForWorldAabb(target));
  return true;
}

export function createSelectionBoxHelper(box: Box3): Box3Helper {
  const helper = new Box3Helper(box, SELECTION_HIGHLIGHT_COLOR);
  helper.userData.isSelectionHighlight = true;
  helper.raycast = () => {
    return;
  };
  return helper;
}

const disposeSelectionHelper = (helper: Box3Helper): void => {
  helper.geometry.dispose();
  const material = helper.material as LineBasicMaterial;
  material.dispose();
};

export class SelectionBoxHighlighter {
  private readonly entries = new Map<Object3D, { helper: Box3Helper; box: Box3 }>();
  private readonly scene: Scene;

  public constructor(scene: Scene) {
    this.scene = scene;
  }

  public setTargets(targets: readonly Object3D[]): void {
    const keep = new Set(targets);
    for (const [object, entry] of this.entries) {
      if (!keep.has(object)) {
        this.scene.remove(entry.helper);
        disposeSelectionHelper(entry.helper);
        this.entries.delete(object);
      }
    }
    for (const object of targets) {
      if (this.entries.has(object)) {
        continue;
      }
      const box = new Box3();
      const helper = createSelectionBoxHelper(box);
      this.scene.add(helper);
      this.entries.set(object, { helper, box });
    }
    this.update();
  }

  public update(): void {
    for (const [object, { helper, box }] of this.entries) {
      helper.visible = setPaddedWorldAabbFromObject(object, box);
    }
  }

  public dispose(): void {
    this.setTargets([]);
  }
}
