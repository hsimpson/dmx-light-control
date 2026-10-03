import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { screen } from '@testing-library/react';
import { ACESFilmicToneMapping, DirectionalLight, PCFShadowMap } from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ThreeCanvas, { type ThreeCanvasContext } from './three-canvas';

const fromScene = vi.fn(() => ({
  texture: {
    dispose: vi.fn(),
  },
}));
const pmremDispose = vi.fn();
const environmentDispose = vi.fn();
const setAnimationLoop = vi.fn();
const rendererDispose = vi.fn();
const controlsUpdate = vi.fn(() => false);
const controlsChangeListeners = new Set<() => void>();
const controlsDispose = vi.fn();
const rendererRender = vi.fn();
const rendererClear = vi.fn();
const rendererClearDepth = vi.fn();
const rendererGetSize = vi.fn();
const rendererSetViewport = vi.fn();
const rendererSetScissor = vi.fn();
const rendererSetScissorTest = vi.fn();
const gizmoUpdateFrom = vi.fn();
const gizmoRender = vi.fn();
const gizmoDispose = vi.fn();
const createAxisOrientationGizmo = vi.fn(() => ({
  scene: {},
  camera: {},
  updateFrom: gizmoUpdateFrom,
  render: gizmoRender,
  dispose: gizmoDispose,
}));
const aoRender = vi.fn();
const aoSetSize = vi.fn();
const aoDispose = vi.fn();
const aoSceneDepth = vi.fn(() => ({ texture: { name: 'scene-depth' }, width: 640, height: 480 }));
const createSceneAoComposer = vi.fn(() => ({
  render: aoRender,
  setSize: aoSetSize,
  dispose: aoDispose,
  getSceneDepth: aoSceneDepth,
}));

vi.mock('./axis-orientation-gizmo', () => ({
  createAxisOrientationGizmo: (...args: unknown[]) => createAxisOrientationGizmo(...args),
}));

vi.mock('./scene-ao-composer', () => ({
  createSceneAoComposer: (...args: unknown[]) => createSceneAoComposer(...args),
}));

vi.mock('three', async importOriginal => {
  const actual = await importOriginal<typeof import('three')>();
  return {
    ...actual,
    WebGLRenderer: class {
      public autoClear = true;
      public outputColorSpace = '';
      public toneMapping = 0;
      public toneMappingExposure = 1;
      public shadowMap = { enabled: false, type: 0 };
      public domElement = document.createElement('canvas');
      public setPixelRatio() {
        return undefined;
      }
      public setSize() {
        return undefined;
      }
      public setAnimationLoop(callback: unknown) {
        setAnimationLoop(callback);
      }
      public dispose() {
        rendererDispose();
      }
      public render() {
        rendererRender();
      }
      public clear() {
        rendererClear();
      }
      public clearDepth() {
        rendererClearDepth();
      }
      public getRenderTarget() {
        return null;
      }
      public setRenderTarget() {
        return undefined;
      }
      public getClearColor(target: { set: (color: number) => unknown }) {
        return target.set(0x000000);
      }
      public getClearAlpha() {
        return 1;
      }
      public setClearColor() {
        return undefined;
      }
      public getSize(target: { set: (width: number, height: number) => unknown }) {
        rendererGetSize();
        return target.set(640, 480);
      }
      public getDrawingBufferSize(target: { set: (width: number, height: number) => unknown }) {
        return target.set(640, 480);
      }
      public getPixelRatio() {
        return 1;
      }
      public getContext() {
        return {
          getExtension() {
            return null;
          },
        };
      }
      public setViewport(x: number, y: number, width: number, height: number) {
        rendererSetViewport(x, y, width, height);
      }
      public setScissor(x: number, y: number, width: number, height: number) {
        rendererSetScissor(x, y, width, height);
      }
      public setScissorTest(enabled: boolean) {
        rendererSetScissorTest(enabled);
      }
    },
    PMREMGenerator: class {
      public fromScene() {
        return fromScene();
      }
      public dispose() {
        pmremDispose();
      }
    },
  };
});

vi.mock('three/examples/jsm/environments/RoomEnvironment.js', () => ({
  RoomEnvironment: class {
    public dispose() {
      environmentDispose();
    }
  },
}));

vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: class {
    public enableDamping = false;
    public target = {
      copy() {
        return undefined;
      },
    };
    public update() {
      return controlsUpdate();
    }
    public addEventListener(type: string, listener: () => void) {
      if (type === 'change') {
        controlsChangeListeners.add(listener);
      }
    }
    public removeEventListener(type: string, listener: () => void) {
      if (type === 'change') {
        controlsChangeListeners.delete(listener);
      }
    }
    public dispose() {
      controlsDispose();
    }
  },
}));

describe('ThreeCanvas', () => {
  class ResizeObserverMock {
    public observe() {
      return undefined;
    }
    public disconnect() {
      return undefined;
    }
    public unobserve() {
      return undefined;
    }
  }

  beforeEach(() => {
    fromScene.mockClear();
    pmremDispose.mockClear();
    environmentDispose.mockClear();
    setAnimationLoop.mockReset();
    controlsUpdate.mockReset();
    controlsUpdate.mockReturnValue(false);
    controlsChangeListeners.clear();
    rendererDispose.mockClear();
    controlsDispose.mockClear();
    rendererRender.mockClear();
    rendererClear.mockClear();
    rendererClearDepth.mockClear();
    rendererGetSize.mockClear();
    rendererSetViewport.mockClear();
    rendererSetScissor.mockClear();
    rendererSetScissorTest.mockClear();
    gizmoUpdateFrom.mockClear();
    gizmoRender.mockClear();
    gizmoDispose.mockClear();
    createAxisOrientationGizmo.mockClear();
    aoRender.mockClear();
    aoSetSize.mockClear();
    aoDispose.mockClear();
    aoSceneDepth.mockClear();
    createSceneAoComposer.mockClear();
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  });

  it('renders the host and hands a framed catalog viewport to onReady', () => {
    const onReady = vi.fn();
    renderWithProviders(<ThreeCanvas testId="shared-three-canvas" onReady={onReady} />);

    expect(screen.getByTestId('shared-three-canvas')).toBeInTheDocument();
    expect(onReady).toHaveBeenCalledTimes(1);
    const context = onReady.mock.calls[0]?.[0] as ThreeCanvasContext;
    expect(context.scene).toBeDefined();
    expect(context.camera).toBeDefined();
    expect(context.renderer).toBeDefined();
    expect(context.controls).toBeDefined();
    expect(context.frameObject).toEqual(expect.any(Function));
    expect(context.controls.enableDamping).toBe(true);
    expect(context.renderer.toneMapping).toBe(ACESFilmicToneMapping);
    expect(context.renderer.shadowMap.enabled).toBe(true);
    expect(context.renderer.shadowMap.type).toBe(PCFShadowMap);
    const directionalLights = context.scene.children.filter(
      (child): child is DirectionalLight => child instanceof DirectionalLight,
    );
    const key = directionalLights.find(light => light.intensity === 1.65);
    const fill = directionalLights.find(light => light.intensity === 0.55);
    expect(key?.castShadow).toBe(true);
    expect(key?.shadow.mapSize.x).toBe(2048);
    expect(key?.shadow.mapSize.y).toBe(2048);
    expect(key?.shadow.camera.left).toBe(-22);
    expect(key?.shadow.camera.right).toBe(22);
    expect(key?.shadow.camera.top).toBe(22);
    expect(key?.shadow.camera.bottom).toBe(-22);
    expect(fill?.castShadow).toBe(false);
    expect(fromScene).toHaveBeenCalled();
    expect(environmentDispose).toHaveBeenCalled();
    expect(createSceneAoComposer).toHaveBeenCalledWith(context.renderer, context.scene, context.camera);
    expect(aoSetSize).toHaveBeenCalled();
  });

  it('stops the loop and disposes the viewport on unmount', () => {
    const { unmount } = renderWithProviders(<ThreeCanvas testId="shared-three-canvas" onReady={() => undefined} />);
    unmount();

    expect(setAnimationLoop).toHaveBeenCalledWith(null);
    expect(controlsDispose).toHaveBeenCalled();
    expect(aoDispose).toHaveBeenCalled();
    expect(pmremDispose).toHaveBeenCalled();
    expect(rendererDispose).toHaveBeenCalled();
  });

  it('renders the orientation gizmo from the animation loop and disposes it on unmount', () => {
    const { unmount } = renderWithProviders(
      <ThreeCanvas testId="shared-three-canvas" showOrientationGizmo onReady={() => undefined} />,
    );

    expect(createAxisOrientationGizmo).toHaveBeenCalledTimes(1);
    const loop = setAnimationLoop.mock.calls.find(([callback]) => typeof callback === 'function')?.[0] as
      (() => void) | undefined;
    expect(loop).toEqual(expect.any(Function));
    loop?.();

    expect(aoRender).toHaveBeenCalled();
    expect(rendererRender).toHaveBeenCalled();
    expect(gizmoUpdateFrom).toHaveBeenCalled();
    expect(gizmoRender).toHaveBeenCalled();
    expect(gizmoRender.mock.invocationCallOrder[0]).toBeGreaterThan(rendererRender.mock.invocationCallOrder[0] ?? 0);

    unmount();

    expect(gizmoDispose).toHaveBeenCalled();
    expect(setAnimationLoop).toHaveBeenCalledWith(null);
    expect(rendererDispose).toHaveBeenCalled();
  });

  const latestLoop = () =>
    [...setAnimationLoop.mock.calls].reverse().find(([callback]) => typeof callback === 'function')?.[0] as
      ((time: number) => void) | undefined;

  it('draws one frame and then stops while the scene is idle', () => {
    renderWithProviders(<ThreeCanvas testId="shared-three-canvas" onReady={() => undefined} />);
    const loop = latestLoop();
    expect(loop).toEqual(expect.any(Function));

    loop?.(0);
    expect(aoRender).toHaveBeenCalledTimes(1);
    expect(setAnimationLoop).toHaveBeenCalledWith(null);

    loop?.(16);
    expect(aoRender).toHaveBeenCalledTimes(1);
  });

  it('keeps drawing while orbit damping is still moving', () => {
    controlsUpdate.mockReturnValue(true);
    renderWithProviders(<ThreeCanvas testId="shared-three-canvas" onReady={() => undefined} />);
    const loop = latestLoop();

    loop?.(0);
    loop?.(1000 / 60);

    expect(aoRender).toHaveBeenCalledTimes(2);
    expect(setAnimationLoop).not.toHaveBeenCalledWith(null);
  });

  it('skips draws that arrive faster than 60 FPS', () => {
    controlsUpdate.mockReturnValue(true);
    renderWithProviders(<ThreeCanvas testId="shared-three-canvas" onReady={() => undefined} />);
    const loop = latestLoop();

    loop?.(0);
    loop?.(8);

    expect(aoRender).toHaveBeenCalledTimes(1);
    expect(setAnimationLoop).not.toHaveBeenCalledWith(null);

    loop?.(1000 / 60);
    expect(aoRender).toHaveBeenCalledTimes(2);
  });

  it('keeps drawing while onFrame reports an animation in progress', () => {
    const onFrame = vi.fn(() => true);
    renderWithProviders(<ThreeCanvas testId="shared-three-canvas" onFrame={onFrame} onReady={() => undefined} />);
    const loop = latestLoop();

    loop?.(1000);
    loop?.(1032);

    expect(onFrame).toHaveBeenCalledTimes(2);
    expect(aoRender).toHaveBeenCalledTimes(2);
    expect(setAnimationLoop).not.toHaveBeenCalledWith(null);
  });

  it('draws again after the controls change once the loop has gone idle', () => {
    renderWithProviders(<ThreeCanvas testId="shared-three-canvas" onReady={() => undefined} />);
    const loop = latestLoop();
    loop?.(0);
    expect(aoRender).toHaveBeenCalledTimes(1);

    for (const listener of controlsChangeListeners) {
      listener();
    }
    latestLoop()?.(32);

    expect(aoRender).toHaveBeenCalledTimes(2);
  });
});
