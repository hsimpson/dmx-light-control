export type SceneSelectionKind = 'object' | 'fixture';

export type SceneSelectionItem = {
  kind: SceneSelectionKind;
  publicId: string;
};

function isSameSelectionItem(left: SceneSelectionItem, right: SceneSelectionItem): boolean {
  return left.kind === right.kind && left.publicId === right.publicId;
}

export function applySceneSelectionClick(
  current: readonly SceneSelectionItem[],
  picked: SceneSelectionItem | null,
  additive: boolean,
): SceneSelectionItem[] {
  if (!picked) {
    return [];
  }
  if (!additive) {
    return [picked];
  }
  const existingIndex = current.findIndex(item => isSameSelectionItem(item, picked));
  if (existingIndex >= 0) {
    return current.filter((_, index) => index !== existingIndex);
  }
  return [...current, picked];
}

export function primarySelection(selection: readonly SceneSelectionItem[]): SceneSelectionItem | null {
  return selection.at(-1) ?? null;
}

export function selectedIdsOfKind(selection: readonly SceneSelectionItem[], kind: SceneSelectionKind): string[] {
  return selection.filter(item => item.kind === kind).map(item => item.publicId);
}
