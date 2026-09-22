import { Euler, Matrix4, Object3D, Quaternion, Vector3 } from 'three';

export type SceneObjectSize = {
  sizeX: number | null;
  sizeY: number | null;
  sizeZ: number | null;
};

export type SceneObjectPose = {
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
};

const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;

export function decomposePose(transform: number[]): SceneObjectPose {
  const matrix = new Matrix4().fromArray(transform);
  const position = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3();
  matrix.decompose(position, quaternion, scale);
  const euler = new Euler().setFromQuaternion(quaternion, 'XYZ');
  return {
    positionX: position.x,
    positionY: position.y,
    positionZ: position.z,
    rotationX: euler.x * DEG,
    rotationY: euler.y * DEG,
    rotationZ: euler.z * DEG,
  };
}

export function composeTransformFromPose(pose: SceneObjectPose): number[] {
  const euler = new Euler(pose.rotationX * RAD, pose.rotationY * RAD, pose.rotationZ * RAD, 'XYZ');
  const quaternion = new Quaternion().setFromEuler(euler);
  return new Matrix4()
    .compose(new Vector3(pose.positionX, pose.positionY, pose.positionZ), quaternion, new Vector3(1, 1, 1))
    .toArray();
}

export function applyTransformMatrix(object: Object3D, transform: number[]): void {
  const matrix = new Matrix4().fromArray(transform);
  const position = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3();
  matrix.decompose(position, quaternion, scale);
  object.position.copy(position);
  object.quaternion.copy(quaternion);
  object.scale.set(1, 1, 1);
}

export function applyVisualSize(visual: Object3D, size: SceneObjectSize): void {
  if (size.sizeX === null || size.sizeY === null || size.sizeZ === null) {
    visual.scale.set(1, 1, 1);
    return;
  }
  visual.scale.set(size.sizeX, size.sizeY, size.sizeZ);
}

export function bakeInstancePose(
  object: Object3D,
  visual: Object3D,
  isScalable: boolean,
): { transform: number[] } & SceneObjectSize {
  const position = object.position.clone();
  const quaternion = object.quaternion.clone();
  const scale = object.scale.clone();
  object.scale.set(1, 1, 1);

  const translationRotation = new Matrix4().compose(position, quaternion, new Vector3(1, 1, 1));

  if (!isScalable) {
    visual.scale.set(1, 1, 1);
    return { transform: translationRotation.toArray(), sizeX: null, sizeY: null, sizeZ: null };
  }

  const sizeX = visual.scale.x * scale.x;
  const sizeY = visual.scale.y * scale.y;
  const sizeZ = visual.scale.z * scale.z;
  visual.scale.set(sizeX, sizeY, sizeZ);
  return { transform: translationRotation.toArray(), sizeX, sizeY, sizeZ };
}

export function bakeWorldTranslationRotation(object: Object3D): number[] {
  object.updateMatrixWorld(true);
  const position = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3();
  object.matrixWorld.decompose(position, quaternion, scale);
  return new Matrix4().compose(position, quaternion, new Vector3(1, 1, 1)).toArray();
}

export function placeSelectionGroup(group: Object3D, members: Object3D[]): void {
  const center = new Vector3();
  for (const member of members) {
    member.updateMatrixWorld(true);
    center.add(new Vector3().setFromMatrixPosition(member.matrixWorld));
  }
  if (members.length > 0) {
    center.divideScalar(members.length);
  }
  group.position.copy(center);
  group.quaternion.identity();
  group.scale.set(1, 1, 1);
  group.updateMatrixWorld(true);
  for (const member of members) {
    group.attach(member);
  }
}

export function releaseSelectionGroup(group: Object3D, parent: Object3D): void {
  for (const member of [...group.children]) {
    parent.attach(member);
  }
}

export function syncInstanceParent(scene: Object3D, root: Object3D, selectionGroup: Object3D | null): void {
  if (selectionGroup !== null && root.parent === selectionGroup) {
    return;
  }
  scene.add(root);
}
