import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { ProjectEnvironmentType, SceneObjectGeometryKind } from '@/shared/types/graphql/graphql';
import { fireEvent, screen } from '@testing-library/react';
import { PCFShadowMap } from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ThreeDRoomCanvas from './three-d-room-canvas';

const load = vi.fn();

const {
  transformControlsConstruct,
  intersectObjects,
  intersectBox,
  frameCameraOnObject,
  capturedThreeCanvasProps,
  capturedRenderer,
  createdMeshes,
} = vi.hoisted(() => ({
  transformControlsConstruct: vi.fn(),
  intersectObjects: vi.fn(() => [] as { object: { userData: Record<string, unknown>; parent: unknown } }[]),
  intersectBox: vi.fn(() => null as { x?: number } | null),
  frameCameraOnObject: vi.fn(),
  capturedThreeCanvasProps: { current: undefined as { showOrientationGizmo?: boolean } | undefined },
  capturedRenderer: { current: undefined as { shadowMap: { enabled: boolean; type: number } } | undefined },
  createdMeshes: [] as { name: string; castShadow: boolean; receiveShadow: boolean }[],
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

vi.mock('./scene-object-pose', () => ({
  applyTransformMatrix: vi.fn(),
  applyVisualSize: vi.fn(),
  bakeInstancePose: vi.fn(),
}));

vi.mock('@/lib/three/frame-camera', () => ({
  frameCameraOnObject,
}));

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
    public remove() {
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
    public clear() {
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
    BoxGeometry: class {
      public dispose() {
        return undefined;
      }
    },
    Box3: class {
      public setFromObject() {
        return this;
      }
      public isEmpty() {
        return false;
      }
      public expandByScalar() {
        return this;
      }
    },
    Vector3: class {
      public distanceToSquared() {
        return Number.POSITIVE_INFINITY;
      }
    },
    Mesh: class {
      public name = '';
      public isMesh = true;
      public castShadow = false;
      public receiveShadow = false;
      public position = new Position();
      public scale = new Position();
      public geometry = {
        dispose() {
          return undefined;
        },
      };
      public material = {
        dispose() {
          return undefined;
        },
      };
      public constructor() {
        createdMeshes.push(this);
      }
    },
    MeshStandardMaterial: class {
      public dispose() {
        return undefined;
      }
    },
    Group: class {
      public userData: Record<string, unknown> = {};
      public add() {
        return this;
      }
      public getObjectByName() {
        return null;
      }
    },
    Raycaster: class {
      public ray = {
        origin: {
          distanceToSquared() {
            return 1;
          },
        },
        intersectBox() {
          return intersectBox();
        },
      };
      public setFromCamera() {
        return undefined;
      }
      public intersectObjects(objects: unknown[]) {
        return intersectObjects(objects);
      }
    },
    Vector2: class {
      public x = 0;
      public y = 0;
    },
    DirectionalLight: class {
      public position = new Position();
      public castShadow = false;
      public target = {};
      public shadow = {
        mapSize: {
          x: 512,
          y: 512,
          set(width: number, height: number) {
            this.x = width;
            this.y = height;
            return this;
          },
        },
        camera: {
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          near: 0,
          far: 0,
          updateProjectionMatrix() {
            return undefined;
          },
        },
        bias: 0,
        normalBias: 0,
        radius: 1,
        blurSamples: 8,
      };
      public constructor(
        public readonly color = 0xffffff,
        public readonly intensity = 1,
      ) {}
    },
    Color: class {
      public constructor(public readonly hex = 0) {}
    },
    SRGBColorSpace: 'srgb',
    ACESFilmicToneMapping: 4,
    PCFShadowMap: 1,
    HemisphereLight: class {
      public constructor(
        public readonly sky = 0,
        public readonly ground = 0,
        public readonly intensity = 1,
      ) {}
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

vi.mock('three/examples/jsm/controls/TransformControls.js', () => ({
  TransformControls: class {
    public object: unknown;
    public mode = 'translate';
    public dragging = false;
    public enabled = true;
    public size = 1;
    public constructor(..._args: unknown[]) {
      transformControlsConstruct();
    }
    public addEventListener() {
      return undefined;
    }
    public removeEventListener() {
      return undefined;
    }
    public getHelper() {
      return { type: 'helper' };
    }
    public attach() {
      return this;
    }
    public detach() {
      return this;
    }
    public disconnect() {
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
    public minDistance = 0;
    public maxDistance = 0;
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
    intersectObjects.mockReset();
    intersectObjects.mockReturnValue([]);
    intersectBox.mockReset();
    intersectBox.mockReturnValue(null);
    frameCameraOnObject.mockReset();
    capturedThreeCanvasProps.current = undefined;
    capturedRenderer.current = undefined;
    createdMeshes.length = 0;
  });

  it('opts the room canvas into the orientation gizmo', () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    renderWithProviders(
      <ThreeDRoomCanvas environmentType={ProjectEnvironmentType.Room} roomWidth={10} roomLength={8} roomHeight={5} />,
    );
    expect(capturedThreeCanvasProps.current?.showOrientationGizmo).toBe(true);
    expect(capturedRenderer.current?.shadowMap.enabled).toBe(true);
    expect(capturedRenderer.current?.shadowMap.type).toBe(PCFShadowMap);
  });

  it('loads the room glTF', () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    renderWithProviders(
      <ThreeDRoomCanvas environmentType={ProjectEnvironmentType.Room} roomWidth={10} roomLength={8} roomHeight={5} />,
    );
    expect(screen.getByTestId('three-d-room-canvas')).toBeInTheDocument();
    expect(load).toHaveBeenCalled();
    expect(String(load.mock.calls[0]?.[0])).toContain('/assets/3d/room.gltf');
  });

  it('does not load the room glTF for simple ground', () => {
    load.mockClear();
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    renderWithProviders(
      <ThreeDRoomCanvas
        environmentType={ProjectEnvironmentType.SimpleGround}
        roomWidth={10}
        roomLength={8}
        roomHeight={5}
      />,
    );
    expect(screen.getByTestId('three-d-room-canvas')).toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();
    expect(frameCameraOnObject).toHaveBeenCalled();
    expect(createdMeshes[0]?.receiveShadow).toBe(true);
    expect(createdMeshes[0]?.castShadow).toBe(false);
  });

  it('AABB-frames the room after the glTF loads', () => {
    load.mockClear();
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    renderWithProviders(
      <ThreeDRoomCanvas environmentType={ProjectEnvironmentType.Room} roomWidth={10} roomLength={8} roomHeight={5} />,
    );
    const onLoad = load.mock.calls[0]?.[1] as
      | ((gltf: {
          scene: {
            getObjectByName: () => { name: string; getObjectByName: () => undefined };
            traverse: (cb: (object: unknown) => void) => void;
          };
        }) => void)
      | undefined;
    expect(onLoad).toEqual(expect.any(Function));
    const room = { name: 'room', getObjectByName: () => undefined };
    const floor = { isMesh: true, name: 'floor', castShadow: true, receiveShadow: false };
    onLoad?.({
      scene: {
        getObjectByName: () => room,
        traverse(callback: (object: unknown) => void) {
          callback(floor);
        },
      },
    });
    expect(frameCameraOnObject).toHaveBeenCalledWith(expect.anything(), expect.anything(), room);
    expect(floor.receiveShadow).toBe(true);
    expect(floor.castShadow).toBe(false);
  });

  it('AABB-frames the environment again when room dimensions change', () => {
    load.mockClear();
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    const { rerender } = renderWithProviders(
      <ThreeDRoomCanvas
        environmentType={ProjectEnvironmentType.SimpleGround}
        roomWidth={10}
        roomLength={8}
        roomHeight={5}
      />,
    );
    const callsAfterMount = frameCameraOnObject.mock.calls.length;
    rerender(
      <ThreeDRoomCanvas
        environmentType={ProjectEnvironmentType.SimpleGround}
        roomWidth={20}
        roomLength={12}
        roomHeight={6}
      />,
    );
    expect(frameCameraOnObject.mock.calls.length).toBeGreaterThan(callsAfterMount);
  });

  it('creates translate and rotate TransformControls when an object is selected', () => {
    transformControlsConstruct.mockClear();
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    renderWithProviders(
      <ThreeDRoomCanvas
        environmentType={ProjectEnvironmentType.SimpleGround}
        roomWidth={10}
        roomLength={8}
        roomHeight={5}
        objects={[
          {
            publicId: 'obj-1',
            sizeX: 1,
            sizeY: 1,
            sizeZ: 1,
            transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
            sceneObjectType: {
              geometryKind: SceneObjectGeometryKind.Box,
              modelPath: null,
              isScalable: true,
            },
          },
        ]}
        selectedObjectPublicId="obj-1"
      />,
    );
    expect(transformControlsConstruct.mock.calls.length).toBeGreaterThanOrEqual(2);
    const visual = createdMeshes.find(mesh => mesh.name === 'visual');
    expect(visual?.castShadow).toBe(true);
    expect(visual?.receiveShadow).toBe(true);
  });

  it('loads a GLTF catalog object from the API origin', () => {
    load.mockClear();
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    renderWithProviders(
      <ThreeDRoomCanvas
        environmentType={ProjectEnvironmentType.SimpleGround}
        roomWidth={10}
        roomLength={8}
        roomHeight={5}
        objects={[
          {
            publicId: 'obj-1',
            sizeX: null,
            sizeY: null,
            sizeZ: null,
            transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
            sceneObjectType: {
              geometryKind: SceneObjectGeometryKind.Gltf,
              modelPath: '/assets/3d/light_stand.glb',
              isScalable: false,
            },
          },
        ]}
      />,
    );
    expect(load).toHaveBeenCalled();
    expect(String(load.mock.calls[0]?.[0])).toContain('/assets/3d/light_stand.glb');
    const onLoad = load.mock.calls[0]?.[1] as
      ((gltf: { scene: { name?: string; traverse: (cb: (object: unknown) => void) => void } }) => void) | undefined;
    const instanceMesh = { isMesh: true, castShadow: false, receiveShadow: false };
    onLoad?.({
      scene: {
        traverse(callback: (object: unknown) => void) {
          callback(instanceMesh);
        },
      },
    });
    expect(instanceMesh.castShadow).toBe(true);
    expect(instanceMesh.receiveShadow).toBe(true);
  });

  it('clears selection when the empty scene is clicked', () => {
    const onSelectObject = vi.fn();
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    renderWithProviders(
      <ThreeDRoomCanvas
        environmentType={ProjectEnvironmentType.SimpleGround}
        roomWidth={10}
        roomLength={8}
        roomHeight={5}
        onSelectObject={onSelectObject}
      />,
    );
    fireEvent.pointerUp(screen.getByTestId('three-d-room-canvas'));
    expect(onSelectObject).toHaveBeenCalledWith(null);
  });

  it('selects an object even when gizmo helpers are under the pointer', () => {
    const onSelectObject = vi.fn();
    intersectBox.mockReturnValue({});
    intersectObjects.mockImplementation((objects: unknown[]) => {
      if (Array.isArray(objects) && objects.some(object => (object as { type?: string }).type === 'helper')) {
        return [{ object: { userData: {}, parent: null } }];
      }
      return [{ object: { userData: { project3dObjectId: 'obj-1' }, parent: null } }];
    });
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    renderWithProviders(
      <ThreeDRoomCanvas
        environmentType={ProjectEnvironmentType.SimpleGround}
        roomWidth={10}
        roomLength={8}
        roomHeight={5}
        objects={[
          {
            publicId: 'obj-1',
            sizeX: 1,
            sizeY: 1,
            sizeZ: 1,
            transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
            sceneObjectType: {
              geometryKind: SceneObjectGeometryKind.Box,
              modelPath: null,
              isScalable: true,
            },
          },
        ]}
        onSelectObject={onSelectObject}
      />,
    );
    fireEvent.pointerUp(screen.getByTestId('three-d-room-canvas'));
    expect(onSelectObject).toHaveBeenCalledWith('obj-1');
    expect(onSelectObject).not.toHaveBeenCalledWith(null);
  });

  it('clears selection when the click misses objects even if gizmos are under the pointer', () => {
    const onSelectObject = vi.fn();
    intersectBox.mockReturnValue(null);
    intersectObjects.mockReturnValue([{ object: { userData: {}, parent: null } }]);
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    renderWithProviders(
      <ThreeDRoomCanvas
        environmentType={ProjectEnvironmentType.SimpleGround}
        roomWidth={10}
        roomLength={8}
        roomHeight={5}
        objects={[
          {
            publicId: 'obj-1',
            sizeX: 1,
            sizeY: 1,
            sizeZ: 1,
            transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
            sceneObjectType: {
              geometryKind: SceneObjectGeometryKind.Box,
              modelPath: null,
              isScalable: true,
            },
          },
        ]}
        selectedObjectPublicId="obj-1"
        onSelectObject={onSelectObject}
      />,
    );
    fireEvent.pointerUp(screen.getByTestId('three-d-room-canvas'));
    expect(onSelectObject).toHaveBeenCalledWith(null);
  });

  it('does not change selection after orbiting the camera', () => {
    const onSelectObject = vi.fn();
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    renderWithProviders(
      <ThreeDRoomCanvas
        environmentType={ProjectEnvironmentType.SimpleGround}
        roomWidth={10}
        roomLength={8}
        roomHeight={5}
        selectedObjectPublicId="obj-1"
        onSelectObject={onSelectObject}
      />,
    );
    const canvas = screen.getByTestId('three-d-room-canvas');
    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.pointerUp(canvas, { clientX: 80, clientY: 60 });
    expect(onSelectObject).not.toHaveBeenCalled();
  });

  it('attaches rotate and scale gizmos for the selected scalable object', () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    renderWithProviders(
      <ThreeDRoomCanvas
        environmentType={ProjectEnvironmentType.SimpleGround}
        roomWidth={10}
        roomLength={8}
        roomHeight={5}
        objects={[
          {
            publicId: 'obj-1',
            sizeX: 1,
            sizeY: 1,
            sizeZ: 1,
            transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
            sceneObjectType: {
              geometryKind: SceneObjectGeometryKind.Box,
              modelPath: null,
              isScalable: true,
            },
          },
        ]}
        selectedObjectPublicId="obj-1"
        scaleGizmoEnabled
        poseGizmoMode="rotate"
      />,
    );
    expect(transformControlsConstruct).toHaveBeenCalled();
  });

  it('attaches translate gizmos when no object is selected', () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    renderWithProviders(
      <ThreeDRoomCanvas
        environmentType={ProjectEnvironmentType.SimpleGround}
        roomWidth={10}
        roomLength={8}
        roomHeight={5}
        objects={[]}
        selectedObjectPublicId={null}
        poseGizmoMode="translate"
      />,
    );
    expect(transformControlsConstruct).toHaveBeenCalled();
  });

  it('uses translate controls for the selected object by default', () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    renderWithProviders(
      <ThreeDRoomCanvas
        environmentType={ProjectEnvironmentType.SimpleGround}
        roomWidth={10}
        roomLength={8}
        roomHeight={5}
        objects={[
          {
            publicId: 'obj-1',
            sizeX: 1,
            sizeY: 1,
            sizeZ: 1,
            transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
            sceneObjectType: {
              geometryKind: SceneObjectGeometryKind.Box,
              modelPath: null,
              isScalable: true,
            },
          },
        ]}
        selectedObjectPublicId="obj-1"
        scaleGizmoEnabled={false}
        poseGizmoMode="translate"
      />,
    );
    expect(transformControlsConstruct).toHaveBeenCalled();
  });
});
