import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { screen } from '@testing-library/react';
import { BoxGeometry, Group, Mesh, MeshPhysicalMaterial, PCFShadowMap } from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FixtureModelPreview, { prepareFixtureModelForPreview } from './fixture-model-preview';

const load = vi.fn();

const { capturedThreeCanvasProps, capturedRenderer } = vi.hoisted(() => ({
  capturedThreeCanvasProps: { current: undefined as { showOrientationGizmo?: boolean } | undefined },
  capturedRenderer: { current: undefined as { shadowMap: { enabled: boolean; type: number } } | undefined },
}));

vi.mock('@/lib/three/three-canvas', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/three/three-canvas')>();
  const ThreeCanvas = actual.default;
  return {
    ...actual,
    default: (props: Parameters<typeof ThreeCanvas>[0]) => {
      capturedThreeCanvasProps.current = props;
      return ThreeCanvas({
        ...props,
        onReady: ctx => {
          capturedRenderer.current = ctx.renderer;
          return props.onReady(ctx);
        },
      });
    },
  };
});

vi.mock('@/lib/three/axis-orientation-gizmo', () => ({
  createAxisOrientationGizmo: () => ({
    updateFrom: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
  }),
}));

vi.mock('@/lib/three/scene-ao-composer', () => ({
  createSceneAoComposer: () => ({
    render() {
      return undefined;
    },
    setSize() {
      return undefined;
    },
    dispose() {
      return undefined;
    },
  }),
}));

vi.mock('three', async importOriginal => {
  const actual = await importOriginal<typeof import('three')>();
  return {
    ...actual,
    WebGLRenderer: class {
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
      public setAnimationLoop() {
        return undefined;
      }
      public dispose() {
        return undefined;
      }
      public render() {
        return undefined;
      }
    },
    PMREMGenerator: class {
      public fromScene() {
        return {
          texture: {
            dispose() {
              return undefined;
            },
          },
        };
      }
      public dispose() {
        return undefined;
      }
    },
  };
});

vi.mock('three/examples/jsm/environments/RoomEnvironment.js', () => ({
  RoomEnvironment: class {
    public dispose() {
      return undefined;
    }
  },
}));

vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: class {
    public target = {
      copy() {
        return undefined;
      },
      set() {
        return undefined;
      },
    };
    public enableDamping = false;
    public minDistance = 0;
    public maxDistance = 0;
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

describe('FixtureModelPreview', () => {
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
    load.mockReset();
    capturedThreeCanvasProps.current = undefined;
    capturedRenderer.current = undefined;
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  });

  it('renders an interactive preview host', () => {
    renderWithProviders(<FixtureModelPreview url="/assets/fixtures/_defaults/model.glb" />);

    expect(screen.getByTestId('fixture-model-preview')).toBeInTheDocument();
    expect(load).toHaveBeenCalledWith('/assets/fixtures/_defaults/model.glb', expect.any(Function));
  });

  it('opts the fixture preview into the orientation gizmo', () => {
    renderWithProviders(<FixtureModelPreview url="/assets/fixtures/_defaults/model.glb" />);

    expect(capturedThreeCanvasProps.current?.showOrientationGizmo).toBe(true);
  });

  it('enables PCF soft shadows on the preview renderer', () => {
    renderWithProviders(<FixtureModelPreview url="/assets/fixtures/_defaults/model.glb" />);

    expect(capturedRenderer.current?.shadowMap.enabled).toBe(true);
    expect(capturedRenderer.current?.shadowMap.type).toBe(PCFShadowMap);
  });

  it('turns off glass transmission so overlapping lenses keep their shape', () => {
    const material = new MeshPhysicalMaterial({ transmission: 0.15, transparent: true });
    const root = new Group();
    root.add(new Mesh(new BoxGeometry(), material));

    prepareFixtureModelForPreview(root);

    expect(material.transmission).toBe(0);
    expect(material.transparent).toBe(false);
    const mesh = root.children[0] as Mesh;
    expect(mesh.castShadow).toBe(true);
    expect(mesh.receiveShadow).toBe(true);
  });

  it('clears transmission without relying on MeshPhysicalMaterial instanceof', () => {
    const material = { transmission: 0.15, transparent: true, depthWrite: false };
    const mesh = { isMesh: true, material, castShadow: false, receiveShadow: false };
    const root = {
      traverse(callback: (object: typeof mesh) => void) {
        callback(mesh);
      },
    };

    prepareFixtureModelForPreview(root as never);

    expect(material.transmission).toBe(0);
    expect(material.transparent).toBe(false);
    expect(material.depthWrite).toBe(true);
    expect(mesh.castShadow).toBe(true);
    expect(mesh.receiveShadow).toBe(true);
  });
});
