import { OrthographicCamera, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { describe, expect, it, vi } from 'vitest';
import {
  AXIS_GIZMO_MARGIN_PX,
  AXIS_GIZMO_SIZE_PX,
  createAxisOrientationGizmo,
  cssHexFromThreeColor,
} from './axis-orientation-gizmo';

describe('cssHexFromThreeColor', () => {
  it('turns Three.js axis colors into CSS hex so canvas fillStyle is not black', () => {
    expect(cssHexFromThreeColor(0xff0000)).toBe('#ff0000');
    expect(cssHexFromThreeColor(0x00ff00)).toBe('#00ff00');
    expect(cssHexFromThreeColor(0x0000ff)).toBe('#0000ff');
  });
});

describe('createAxisOrientationGizmo', () => {
  it('places the gizmo camera so it looks at the origin with the main camera orientation', () => {
    const gizmo = createAxisOrientationGizmo();
    const mainCamera = new PerspectiveCamera(50, 1, 0.1, 1000);
    mainCamera.up.set(0, 1, 0);
    mainCamera.position.set(4, 3, 8);
    mainCamera.lookAt(0, 0, 0);
    mainCamera.updateMatrixWorld();

    gizmo.updateFrom(mainCamera);

    const distance = gizmo.camera.position.length();
    expect(distance).toBeGreaterThan(0);

    const expectedPosition = new Vector3(0, 0, distance).applyQuaternion(mainCamera.quaternion);
    expect(gizmo.camera.position.x).toBeCloseTo(expectedPosition.x);
    expect(gizmo.camera.position.y).toBeCloseTo(expectedPosition.y);
    expect(gizmo.camera.position.z).toBeCloseTo(expectedPosition.z);
    expect(gizmo.camera.up.x).toBeCloseTo(mainCamera.up.x);
    expect(gizmo.camera.up.y).toBeCloseTo(mainCamera.up.y);
    expect(gizmo.camera.up.z).toBeCloseTo(mainCamera.up.z);

    const forward = new Vector3(0, 0, -1).applyQuaternion(gizmo.camera.quaternion);
    const towardOrigin = gizmo.camera.position.clone().negate().normalize();
    expect(forward.x).toBeCloseTo(towardOrigin.x);
    expect(forward.y).toBeCloseTo(towardOrigin.y);
    expect(forward.z).toBeCloseTo(towardOrigin.z);

    gizmo.dispose();
  });

  it('renders into a top-right scissor inset then restores the full viewport', () => {
    const gizmo = createAxisOrientationGizmo();
    const setViewport = vi.fn();
    const setScissor = vi.fn();
    const setScissorTest = vi.fn();
    const clearDepth = vi.fn();
    const render = vi.fn();

    const renderer = {
      getPixelRatio: () => 2,
      clearDepth,
      setScissorTest,
      setScissor,
      setViewport,
      render,
    } as unknown as WebGLRenderer;

    gizmo.render(renderer, 800, 600);

    const pixelRatio = 2;
    const size = AXIS_GIZMO_SIZE_PX * pixelRatio;
    const margin = AXIS_GIZMO_MARGIN_PX * pixelRatio;
    const x = 800 * pixelRatio - margin - size;
    const y = 600 * pixelRatio - margin - size;

    expect(clearDepth).toHaveBeenCalled();
    expect(setScissorTest).toHaveBeenNthCalledWith(1, true);
    expect(setScissor).toHaveBeenCalledWith(x, y, size, size);
    expect(setViewport).toHaveBeenNthCalledWith(1, x, y, size, size);
    expect(render).toHaveBeenCalledWith(expect.any(Scene), expect.any(OrthographicCamera));
    expect(setScissorTest).toHaveBeenLastCalledWith(false);
    expect(setViewport).toHaveBeenLastCalledWith(0, 0, 800 * pixelRatio, 600 * pixelRatio);

    gizmo.dispose();
  });

  it('can be disposed more than once', () => {
    const gizmo = createAxisOrientationGizmo();
    expect(() => {
      gizmo.dispose();
      gizmo.dispose();
    }).not.toThrow();
  });
});
