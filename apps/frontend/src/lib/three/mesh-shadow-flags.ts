import { Mesh, type Object3D } from 'three';

export type MeshShadowFlags = {
  castShadow: boolean;
  receiveShadow: boolean;
};

const isMeshObject = (object: Object3D): object is Mesh => 'isMesh' in object && object.isMesh === true;

export const applyMeshShadowFlags = (root: Object3D, flags: MeshShadowFlags): void => {
  root.traverse(object => {
    if (!isMeshObject(object)) {
      return;
    }
    object.castShadow = flags.castShadow;
    object.receiveShadow = flags.receiveShadow;
  });
};
