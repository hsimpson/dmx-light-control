import { registerEnumType } from '@nestjs/graphql';

export enum SceneObjectGeometryKind {
  Box = 'Box',
  Gltf = 'Gltf',
}

registerEnumType(SceneObjectGeometryKind, {
  name: 'SceneObjectGeometryKind',
  description: 'How a scene object type is rendered in the 3D view',
});

export const SCENE_OBJECT_TYPE_BOX_PUBLIC_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export const SCENE_OBJECT_TYPE_LIGHT_STAND_PUBLIC_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

export const SCENE_OBJECT_TYPE_LIGHT_STAND_MODEL_PATH = '/assets/3d/light_stand.glb';
