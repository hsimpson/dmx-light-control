import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { screen } from '@testing-library/react';
import { ACESFilmicToneMapping } from 'three';
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
const createSceneAoComposer = vi.fn(() => ({
  render: aoRender,
  setSize: aoSetSize,
  dispose: aoDispose,
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
      public getSize(target: { set: (width: number, height: number) => unknown }) {
        rendererGetSize();
        return target.set(640, 480);
      }
      public getPixelRatio() {
        return 1;
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
      return undefined;
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
    expect(gizmoUpdateFrom).toHaveBeenCalled();
    expect(gizmoRender).toHaveBeenCalled();
    expect(gizmoRender.mock.invocationCallOrder[0]).toBeGreaterThan(aoRender.mock.invocationCallOrder[0] ?? 0);

    unmount();

    expect(gizmoDispose).toHaveBeenCalled();
    expect(setAnimationLoop).toHaveBeenCalledWith(null);
    expect(rendererDispose).toHaveBeenCalled();
  });
});
