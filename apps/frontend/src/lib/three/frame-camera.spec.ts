import { BoxGeometry, Mesh, Object3D, PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { frameCameraOnObject } from './frame-camera';

const createControls = () => ({
  target: new Vector3(),
  minDistance: 0,
  maxDistance: 0,
  update: vi.fn(),
});

describe('frameCameraOnObject', () => {
  it('does nothing when the object has empty bounds', () => {
    const camera = new PerspectiveCamera(50, 1, 0.1, 1000);
    const controls = createControls();
    const cameraPosition = camera.position.clone();

    frameCameraOnObject(camera, controls, new Object3D());

    expect(camera.position.equals(cameraPosition)).toBe(true);
    expect(controls.update).not.toHaveBeenCalled();
  });

  it('frames a known box with the catalog offset and clip distances', () => {
    const camera = new PerspectiveCamera(50, 1, 0.1, 1000);
    const controls = createControls();
    const mesh = new Mesh(new BoxGeometry(2, 2, 2));
    mesh.updateWorldMatrix(true, true);

    frameCameraOnObject(camera, controls, mesh);

    const fovRadians = (50 * Math.PI) / 180;
    const fitDistance = 2 / (2 * Math.tan(fovRadians / 2));
    const distance = fitDistance * 1.35;

    expect(camera.position.x).toBeCloseTo(distance * 0.55);
    expect(camera.position.y).toBeCloseTo(distance * 0.22);
    expect(camera.position.z).toBeCloseTo(-distance * 0.8);
    expect(camera.near).toBeCloseTo(Math.max(distance / 100, 0.01));
    expect(camera.far).toBeCloseTo(Math.max(distance * 100, 100));
    expect(controls.target.x).toBeCloseTo(0);
    expect(controls.target.y).toBeCloseTo(0);
    expect(controls.target.z).toBeCloseTo(0);
    expect(controls.minDistance).toBeCloseTo(distance * 0.25);
    expect(controls.maxDistance).toBeCloseTo(distance * 4);
    expect(controls.update).toHaveBeenCalled();
  });
});
