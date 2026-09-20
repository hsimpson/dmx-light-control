import { describe, expect, it } from 'vitest';
import {
  applySceneSelectionClick,
  primarySelection,
  selectedIdsOfKind,
  type SceneSelectionItem,
} from './scene-selection';

describe('applySceneSelectionClick', () => {
  it('replaces the selection on a plain click', () => {
    const current: SceneSelectionItem[] = [{ kind: 'object', publicId: 'stand-1' }];
    expect(applySceneSelectionClick(current, { kind: 'fixture', publicId: 'pf-1' }, false)).toEqual([
      { kind: 'fixture', publicId: 'pf-1' },
    ]);
  });

  it('clears the selection when the empty scene is clicked', () => {
    const current: SceneSelectionItem[] = [
      { kind: 'object', publicId: 'stand-1' },
      { kind: 'fixture', publicId: 'pf-1' },
    ];
    expect(applySceneSelectionClick(current, null, false)).toEqual([]);
    expect(applySceneSelectionClick(current, null, true)).toEqual([]);
  });

  it('adds a fixture to a selected stand with an additive click', () => {
    const current: SceneSelectionItem[] = [{ kind: 'object', publicId: 'stand-1' }];
    expect(applySceneSelectionClick(current, { kind: 'fixture', publicId: 'pf-1' }, true)).toEqual([
      { kind: 'object', publicId: 'stand-1' },
      { kind: 'fixture', publicId: 'pf-1' },
    ]);
  });

  it('toggles an already selected item off with an additive click', () => {
    const current: SceneSelectionItem[] = [
      { kind: 'object', publicId: 'stand-1' },
      { kind: 'fixture', publicId: 'pf-1' },
    ];
    expect(applySceneSelectionClick(current, { kind: 'object', publicId: 'stand-1' }, true)).toEqual([
      { kind: 'fixture', publicId: 'pf-1' },
    ]);
  });
});

describe('selection helpers', () => {
  it('uses the last clicked item as primary', () => {
    const selection: SceneSelectionItem[] = [
      { kind: 'object', publicId: 'stand-1' },
      { kind: 'fixture', publicId: 'pf-1' },
    ];
    expect(primarySelection(selection)).toEqual({ kind: 'fixture', publicId: 'pf-1' });
    expect(selectedIdsOfKind(selection, 'object')).toEqual(['stand-1']);
    expect(selectedIdsOfKind(selection, 'fixture')).toEqual(['pf-1']);
  });
});
