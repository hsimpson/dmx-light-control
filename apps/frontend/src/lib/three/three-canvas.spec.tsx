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

vi.mock('three', async importOriginal => {
  const actual = await importOriginal<typeof import('three')>();
  return {
    ...actual,
    WebGLRenderer: class {
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
        return undefined;
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
  });

  it('stops the loop and disposes the viewport on unmount', () => {
    const { unmount } = renderWithProviders(<ThreeCanvas testId="shared-three-canvas" onReady={() => undefined} />);
    unmount();

    expect(setAnimationLoop).toHaveBeenCalledWith(null);
    expect(controlsDispose).toHaveBeenCalled();
    expect(pmremDispose).toHaveBeenCalled();
    expect(rendererDispose).toHaveBeenCalled();
  });
});
