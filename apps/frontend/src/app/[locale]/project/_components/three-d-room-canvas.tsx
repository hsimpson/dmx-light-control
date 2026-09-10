'use client';

import { roomGltfUrl, sceneAssetUrl } from '@/lib/graphql/graphql-api-origin';
import { applyMeshShadowFlags } from '@/lib/three/mesh-shadow-flags';
import ThreeCanvas, { type ThreeCanvasContext } from '@/lib/three/three-canvas';
import { ProjectEnvironmentType, SceneObjectGeometryKind } from '@/shared/types/graphql/graphql';
import { useCallback, useEffect, useRef } from 'react';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, type Object3D, Raycaster, Scene, Vector2 } from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { applyRoomDimensions, applySimpleGroundDimensions } from './room-layout';
import { pickClosestObjectByBoundingBox } from './scene-object-pick';
import { applyTransformMatrix, applyVisualSize, bakeInstancePose } from './scene-object-pose';
import classes from './three-d-room-canvas.module.css';

export type ThreeDSceneObject = {
  publicId: string;
  sizeX: number | null;
  sizeY: number | null;
  sizeZ: number | null;
  transform: number[];
  sceneObjectType: {
    geometryKind: SceneObjectGeometryKind;
    modelPath: string | null;
    isScalable: boolean;
  };
};

export type ThreeDRoomCanvasProperties = {
  environmentType: ProjectEnvironmentType;
  roomWidth: number;
  roomLength: number;
  roomHeight: number;
  objects?: ThreeDSceneObject[];
  selectedObjectPublicId?: string | null;
  scaleGizmoEnabled?: boolean;
  poseGizmoMode?: 'translate' | 'rotate';
  onSelectObject?: (publicId: string | null) => void;
  onObjectCommit?: (
    publicId: string,
    pose: { transform: number[]; sizeX: number | null; sizeY: number | null; sizeZ: number | null },
  ) => void;
};

const EMPTY_SCENE_OBJECTS: ThreeDSceneObject[] = [];

const ThreeDRoomCanvas = ({
  environmentType,
  roomWidth,
  roomLength,
  roomHeight,
  objects = EMPTY_SCENE_OBJECTS,
  selectedObjectPublicId = null,
  scaleGizmoEnabled = false,
  poseGizmoMode = 'translate',
  onSelectObject,
  onObjectCommit,
}: ThreeDRoomCanvasProperties) => {
  const roomRef = useRef<Object3D | null>(null);
  const groundRef = useRef<Mesh | null>(null);
  const translateControlsRef = useRef<TransformControls | null>(null);
  const rotateControlsRef = useRef<TransformControls | null>(null);
  const scaleControlsRef = useRef<TransformControls | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const instancesRef = useRef(new Map<string, Group>());
  const onSelectObjectRef = useRef(onSelectObject);
  const onObjectCommitRef = useRef(onObjectCommit);
  const dimensionsRef = useRef({ roomWidth, roomLength, roomHeight });
  const frameObjectRef = useRef<ThreeCanvasContext['frameObject'] | null>(null);

  useEffect(() => {
    onSelectObjectRef.current = onSelectObject;
    onObjectCommitRef.current = onObjectCommit;
  }, [onSelectObject, onObjectCommit]);

  const frameEnvironment = () => {
    if (roomRef.current) {
      frameObjectRef.current?.(roomRef.current);
    }
    if (groundRef.current) {
      frameObjectRef.current?.(groundRef.current);
    }
  };

  const onReady = useCallback(
    ({ host, scene, camera, renderer, controls, frameObject }: ThreeCanvasContext) => {
      sceneRef.current = scene;
      const instanceRoots = instancesRef.current;
      frameObjectRef.current = frameObject;

      type GizmoEntry = {
        transformControls: TransformControls;
        transformHelper: Object3D;
        onDraggingChanged: (event: { value: unknown }) => void;
        onGizmoMouseUp: () => void;
      };

      const gizmoEntries: GizmoEntry[] = [];

      const createTransformControls = (mode: 'translate' | 'rotate' | 'scale', size: number) => {
        const transformControls = new TransformControls(camera, renderer.domElement);
        transformControls.mode = mode;
        transformControls.size = size;
        const transformHelper = transformControls.getHelper();
        scene.add(transformHelper);
        const entry = {
          transformControls,
          transformHelper,
          onDraggingChanged: (_event: { value: unknown }) => {
            /* assigned below */
          },
          onGizmoMouseUp: () => {
            /* assigned below */
          },
        };
        gizmoEntries.push(entry);
        return entry;
      };

      const translateGizmo = createTransformControls('translate', 0.75);
      const rotateGizmo = createTransformControls('rotate', 1.2);
      const scaleGizmo = createTransformControls('scale', 0.95);
      translateControlsRef.current = translateGizmo.transformControls;
      rotateControlsRef.current = rotateGizmo.transformControls;
      scaleControlsRef.current = scaleGizmo.transformControls;

      const isAnyGizmoDragging = () => gizmoEntries.some(entry => entry.transformControls.dragging);

      const commitGizmoPose = (transformControls: TransformControls) => {
        const object = transformControls.object;
        const publicId = object.userData.project3dObjectId as string | undefined;
        const visual = object.getObjectByName('visual');
        if (!publicId || !visual) {
          return;
        }
        const pose = bakeInstancePose(object, visual, Boolean(object.userData.isScalable));
        onObjectCommitRef.current?.(publicId, pose);
      };

      let poseSyncFrame = 0;
      const syncGizmoPose = (transformControls: TransformControls) => {
        if (poseSyncFrame !== 0) {
          return;
        }
        poseSyncFrame = requestAnimationFrame(() => {
          poseSyncFrame = 0;
          commitGizmoPose(transformControls);
        });
      };

      const setOtherGizmosEnabled = (active: TransformControls, enabled: boolean) => {
        for (const entry of gizmoEntries) {
          if (entry.transformControls !== active) {
            entry.transformControls.enabled = enabled;
          }
        }
      };

      let skipSelectionOnPointerUp = false;

      const onTranslateDraggingChanged = (event: { value: unknown }) => {
        setOtherGizmosEnabled(translateGizmo.transformControls, !event.value);
        controls.enabled = !isAnyGizmoDragging();
        if (event.value) {
          skipSelectionOnPointerUp = true;
        }
      };
      const onTranslateObjectChange = () => {
        syncGizmoPose(translateGizmo.transformControls);
      };
      const onTranslateMouseUp = () => {
        commitGizmoPose(translateGizmo.transformControls);
      };
      translateGizmo.onDraggingChanged = onTranslateDraggingChanged;
      translateGizmo.onGizmoMouseUp = onTranslateMouseUp;
      translateGizmo.transformControls.addEventListener('dragging-changed', onTranslateDraggingChanged);
      translateGizmo.transformControls.addEventListener('objectChange', onTranslateObjectChange);
      translateGizmo.transformControls.addEventListener('mouseUp', onTranslateMouseUp);

      const onRotateDraggingChanged = (event: { value: unknown }) => {
        setOtherGizmosEnabled(rotateGizmo.transformControls, !event.value);
        controls.enabled = !isAnyGizmoDragging();
        if (event.value) {
          skipSelectionOnPointerUp = true;
        }
      };
      const onRotateObjectChange = () => {
        syncGizmoPose(rotateGizmo.transformControls);
      };
      const onRotateMouseUp = () => {
        commitGizmoPose(rotateGizmo.transformControls);
      };
      rotateGizmo.onDraggingChanged = onRotateDraggingChanged;
      rotateGizmo.onGizmoMouseUp = onRotateMouseUp;
      rotateGizmo.transformControls.addEventListener('dragging-changed', onRotateDraggingChanged);
      rotateGizmo.transformControls.addEventListener('objectChange', onRotateObjectChange);
      rotateGizmo.transformControls.addEventListener('mouseUp', onRotateMouseUp);

      const onScaleDraggingChanged = (event: { value: unknown }) => {
        setOtherGizmosEnabled(scaleGizmo.transformControls, !event.value);
        controls.enabled = !isAnyGizmoDragging();
        if (event.value) {
          skipSelectionOnPointerUp = true;
        }
      };
      const onScaleObjectChange = () => {
        syncGizmoPose(scaleGizmo.transformControls);
      };
      const onScaleMouseUp = () => {
        commitGizmoPose(scaleGizmo.transformControls);
      };
      scaleGizmo.onDraggingChanged = onScaleDraggingChanged;
      scaleGizmo.onGizmoMouseUp = onScaleMouseUp;
      scaleGizmo.transformControls.addEventListener('dragging-changed', onScaleDraggingChanged);
      scaleGizmo.transformControls.addEventListener('objectChange', onScaleObjectChange);
      scaleGizmo.transformControls.addEventListener('mouseUp', onScaleMouseUp);

      const applyDimensions = () => {
        const { roomWidth: width, roomLength: length, roomHeight: height } = dimensionsRef.current;
        if (roomRef.current) {
          applyRoomDimensions(roomRef.current, width, length, height);
        }
        if (groundRef.current) {
          applySimpleGroundDimensions(groundRef.current, width, length);
        }
        frameEnvironment();
      };

      if (environmentType === ProjectEnvironmentType.Room) {
        const loader = new GLTFLoader();
        loader.load(roomGltfUrl(), gltf => {
          const room = gltf.scene.getObjectByName('room') ?? gltf.scene;
          applyMeshShadowFlags(gltf.scene, { castShadow: false, receiveShadow: true });
          roomRef.current = room;
          scene.add(gltf.scene);
          applyDimensions();
        });
      } else {
        const ground = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ color: 0x6b7280 }));
        ground.castShadow = false;
        ground.receiveShadow = true;
        groundRef.current = ground;
        scene.add(ground);
      }

      applyDimensions();

      const raycaster = new Raycaster();
      const pointer = new Vector2();
      const pointerDragPixels = 4;
      let pointerDownX = 0;
      let pointerDownY = 0;
      const onPointerDown = (event: PointerEvent) => {
        pointerDownX = event.clientX;
        pointerDownY = event.clientY;
      };
      const onPointerUp = (event: PointerEvent) => {
        if (isAnyGizmoDragging() || skipSelectionOnPointerUp) {
          skipSelectionOnPointerUp = false;
          return;
        }
        const deltaX = event.clientX - pointerDownX;
        const deltaY = event.clientY - pointerDownY;
        if (deltaX * deltaX + deltaY * deltaY > pointerDragPixels * pointerDragPixels) {
          return;
        }
        const bounds = renderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
        pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const roots = [...instancesRef.current.values()];
        const picked = pickClosestObjectByBoundingBox(raycaster.ray, roots);
        if (typeof picked?.userData.project3dObjectId === 'string') {
          onSelectObjectRef.current?.(picked.userData.project3dObjectId);
          return;
        }
        onSelectObjectRef.current?.(null);
      };
      host.addEventListener('pointerdown', onPointerDown);
      host.addEventListener('pointerup', onPointerUp);

      return () => {
        cancelAnimationFrame(poseSyncFrame);
        host.removeEventListener('pointerdown', onPointerDown);
        host.removeEventListener('pointerup', onPointerUp);
        translateGizmo.transformControls.removeEventListener('dragging-changed', onTranslateDraggingChanged);
        translateGizmo.transformControls.removeEventListener('objectChange', onTranslateObjectChange);
        translateGizmo.transformControls.removeEventListener('mouseUp', onTranslateMouseUp);
        translateGizmo.transformControls.detach();
        translateGizmo.transformControls.disconnect();
        scene.remove(translateGizmo.transformHelper);
        rotateGizmo.transformControls.removeEventListener('dragging-changed', onRotateDraggingChanged);
        rotateGizmo.transformControls.removeEventListener('objectChange', onRotateObjectChange);
        rotateGizmo.transformControls.removeEventListener('mouseUp', onRotateMouseUp);
        rotateGizmo.transformControls.detach();
        rotateGizmo.transformControls.disconnect();
        scene.remove(rotateGizmo.transformHelper);
        scaleGizmo.transformControls.removeEventListener('dragging-changed', onScaleDraggingChanged);
        scaleGizmo.transformControls.removeEventListener('objectChange', onScaleObjectChange);
        scaleGizmo.transformControls.removeEventListener('mouseUp', onScaleMouseUp);
        scaleGizmo.transformControls.detach();
        scaleGizmo.transformControls.disconnect();
        scene.remove(scaleGizmo.transformHelper);
        groundRef.current?.geometry.dispose();
        if (groundRef.current?.material instanceof MeshStandardMaterial) {
          groundRef.current.material.dispose();
        }
        for (const root of instanceRoots.values()) {
          scene.remove(root);
        }
        instanceRoots.clear();
        roomRef.current = null;
        groundRef.current = null;
        translateControlsRef.current = null;
        rotateControlsRef.current = null;
        scaleControlsRef.current = null;
        sceneRef.current = null;
        frameObjectRef.current = null;
      };
    },
    [environmentType],
  );

  useEffect(() => {
    dimensionsRef.current = { roomWidth, roomLength, roomHeight };
    if (roomRef.current) {
      applyRoomDimensions(roomRef.current, roomWidth, roomLength, roomHeight);
    }
    if (groundRef.current) {
      applySimpleGroundDimensions(groundRef.current, roomWidth, roomLength);
    }
    frameEnvironment();
  }, [roomWidth, roomLength, roomHeight]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) {
      return;
    }

    const known = new Set(objects.map(object => object.publicId));
    for (const [publicId, root] of instancesRef.current) {
      if (!known.has(publicId)) {
        scene.remove(root);
        instancesRef.current.delete(publicId);
      }
    }

    for (const object of objects) {
      let root = instancesRef.current.get(object.publicId);
      if (!root) {
        root = new Group();
        root.userData.project3dObjectId = object.publicId;
        instancesRef.current.set(object.publicId, root);
        const visualParent = root;
        if (object.sceneObjectType.geometryKind === SceneObjectGeometryKind.Box) {
          const mesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ color: 0x8b5a2b }));
          mesh.name = 'visual';
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          visualParent.add(mesh);
        } else if (object.sceneObjectType.modelPath) {
          const loader = new GLTFLoader();
          const capturedRoot = root;
          loader.load(sceneAssetUrl(object.sceneObjectType.modelPath), gltf => {
            if (!instancesRef.current.has(object.publicId)) {
              return;
            }
            gltf.scene.name = 'visual';
            applyMeshShadowFlags(gltf.scene, { castShadow: true, receiveShadow: true });
            capturedRoot.add(gltf.scene);
          });
        }
      }
      scene.add(root);
      root.userData.isScalable = object.sceneObjectType.isScalable;
      const draggingSelected =
        object.publicId === selectedObjectPublicId &&
        [translateControlsRef, rotateControlsRef, scaleControlsRef].some(ref => ref.current?.dragging);
      if (!draggingSelected) {
        applyTransformMatrix(root, object.transform);
        const visual = root.getObjectByName('visual');
        if (visual) {
          applyVisualSize(visual, object);
        }
      }
    }
  }, [objects, selectedObjectPublicId]);

  useEffect(() => {
    const translateControls = translateControlsRef.current;
    const rotateControls = rotateControlsRef.current;
    const scaleControls = scaleControlsRef.current;
    if (!translateControls || !rotateControls || !scaleControls) {
      return;
    }
    const selected = selectedObjectPublicId ? instancesRef.current.get(selectedObjectPublicId) : undefined;
    if (selected) {
      if (poseGizmoMode === 'translate') {
        translateControls.attach(selected);
        rotateControls.detach();
      } else {
        translateControls.detach();
        rotateControls.attach(selected);
      }
      if (scaleGizmoEnabled && Boolean(selected.userData.isScalable)) {
        scaleControls.attach(selected);
      } else {
        scaleControls.detach();
      }
    } else {
      translateControls.detach();
      rotateControls.detach();
      scaleControls.detach();
    }
  }, [selectedObjectPublicId, scaleGizmoEnabled, poseGizmoMode, objects]);

  return <ThreeCanvas className={classes.host} testId="three-d-room-canvas" showOrientationGizmo onReady={onReady} />;
};

export default ThreeDRoomCanvas;
