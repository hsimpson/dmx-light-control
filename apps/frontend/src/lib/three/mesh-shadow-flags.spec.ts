import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { applyMeshShadowFlags } from './mesh-shadow-flags';

describe('applyMeshShadowFlags', () => {
  it('sets cast and receive on nested meshes only', () => {
    const root = new Group();
    const mesh = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
    root.add(mesh);

    applyMeshShadowFlags(root, { castShadow: false, receiveShadow: true });

    expect(root.castShadow).toBe(false);
    expect(mesh.castShadow).toBe(false);
    expect(mesh.receiveShadow).toBe(true);
  });
});
