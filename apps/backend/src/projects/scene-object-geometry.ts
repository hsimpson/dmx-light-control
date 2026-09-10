import { registerEnumType } from '@nestjs/graphql';

export enum SceneObjectGeometryKind {
  Box = 'Box',
  Gltf = 'Gltf',
}

registerEnumType(SceneObjectGeometryKind, {
  name: 'SceneObjectGeometryKind',
  description: 'How a scene object type is rendered in the 3D view',
});

export const SCENE_OBJECT_TYPE_BOX_PUBLIC_ID = '6c774032-4989-4e04-800d-89c1de402000';
export const SCENE_OBJECT_TYPE_LIGHT_STAND_PUBLIC_ID = '9d0d742c-a6b0-4359-b29b-824ed592066a';

export const SCENE_OBJECT_TYPE_LIGHT_STAND_MODEL_PATH = '/assets/3d/light_stand.glb';
