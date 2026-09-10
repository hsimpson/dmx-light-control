import { Box3, type Object3D, type PerspectiveCamera, Vector3 } from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export const frameCameraOnObject = (camera: PerspectiveCamera, controls: OrbitControls, object: Object3D) => {
  const bounds = new Box3().setFromObject(object);
  if (bounds.isEmpty()) {
    return;
  }

  const center = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const fovRadians = (camera.fov * Math.PI) / 180;
  const fitDistance = maxDim / (2 * Math.tan(fovRadians / 2));
  const distance = fitDistance * 1.35;

  camera.position.set(center.x - distance * 0.22, center.y + distance * 0.22, center.z + distance * 0.8);
  camera.near = Math.max(distance / 100, 0.01);
  camera.far = Math.max(distance * 100, 100);
  camera.updateProjectionMatrix();
  controls.target.copy(center);
  controls.minDistance = distance * 0.25;
  controls.maxDistance = distance * 4;
  controls.update();
};
