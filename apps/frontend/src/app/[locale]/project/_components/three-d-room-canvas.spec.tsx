import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ThreeDRoomCanvas from './three-d-room-canvas';

const load = vi.fn();

vi.mock('three', () => {
  class Position {
    public set(_x: number, _y: number, _z: number) {
      return this;
    }
  }

  class Scene {
    public background: unknown;
    public add() {
      return this;
    }
    public getObjectByName() {
      return this;
    }
  }

  class PerspectiveCamera {
    public position = new Position();
    public aspect = 1;
    public updateProjectionMatrix() {
      return undefined;
    }
  }

  class WebGLRenderer {
    public outputColorSpace = '';
    public domElement = document.createElement('canvas');
    public setPixelRatio() {
      return undefined;
    }
    public setSize() {
      return undefined;
    }
    public setAnimationLoop() {
      return undefined;
    }
    public dispose() {
      return undefined;
    }
    public render() {
      return undefined;
    }
  }

  return {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    AmbientLight: class {
      public constructor(
        public readonly color = 0xffffff,
        public readonly intensity = 1,
      ) {}
    },
    DirectionalLight: class {
      public position = new Position();
      public constructor(
        public readonly color = 0xffffff,
        public readonly intensity = 1,
      ) {}
    },
    Color: class {
      public constructor(public readonly hex = 0) {}
    },
    SRGBColorSpace: 'srgb',
  };
});

vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: class {
    public target = {
      set() {
        return undefined;
      },
    };
    public enableDamping = false;
    public update() {
      return undefined;
    }
    public dispose() {
      return undefined;
    }
  },
}));

vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    public load = load;
  },
}));

describe('ThreeDRoomCanvas', () => {
  it('loads the room glTF', () => {
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
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    renderWithProviders(<ThreeDRoomCanvas roomWidth={10} roomLength={8} roomHeight={5} />);
    expect(screen.getByTestId('three-d-room-canvas')).toBeInTheDocument();
    expect(load).toHaveBeenCalled();
    expect(String(load.mock.calls[0]?.[0])).toContain('/assets/3d/room.gltf');
  });
});
