'use client';

import {
  FIXTURE_DEFAULT_MODEL_3D_PATH,
  fixtureAssetDisplayUrl,
} from '@/app/[locale]/fixture/_components/fixture-asset-url';
import { prepareFixtureModelForPreview } from '@/app/[locale]/fixture/_components/fixture-model-preview';
import { dmxStore } from '@/lib/dmx/dmx-store';
import { fixtureBeamColor, type FixtureBeamInput } from '@/lib/fixtures/fixture-beam-color';
import { roomGltfUrl, sceneAssetUrl } from '@/lib/graphql/graphql-api-origin';
import {
  applyFixtureBeamAppearance,
  createFixtureBeamCone,
  disposeFixtureBeamCone,
  updateFixtureBeamStrobe,
} from '@/lib/three/fixture-beam-cone';
import { applyMeshShadowFlags } from '@/lib/three/mesh-shadow-flags';
import ThreeCanvas, { type ThreeCanvasContext } from '@/lib/three/three-canvas';
import { ProjectEnvironmentType, SceneObjectGeometryKind } from '@/shared/types/graphql/graphql';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, type Object3D, Raycaster, Scene, Vector2 } from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { applyRoomDimensions, applySimpleGroundDimensions } from './room-layout';
import { pickClosestSceneObject } from './scene-object-pick';
import { SelectionBoxHighlighter } from './selection-bounding-box';
import {
  applyTransformMatrix,
  applyVisualSize,
  bakeInstancePose,
  bakeWorldTranslationRotation,
  placeSelectionGroup,
  releaseSelectionGroup,
  syncInstanceParent,
} from './scene-object-pose';
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

export type ThreeDProjectFixture = {
  publicId: string;
  transform: number[];
  startAddress?: number;
  channelMode?: FixtureBeamInput['channelMode'];
  fixture: {
    model3dPath?: string | null;
  };
};

export type SceneSelectOptions = {
  additive: boolean;
};

export type ThreeDRoomCanvasProperties = {
  environmentType: ProjectEnvironmentType;
  roomWidth: number;
  roomLength: number;
  roomHeight: number;
  objects?: ThreeDSceneObject[];
  fixtures?: ThreeDProjectFixture[];
  selectedObjectPublicId?: string | null;
  selectedFixturePublicId?: string | null;
  selectedObjectPublicIds?: string[];
  selectedFixturePublicIds?: string[];
  scaleGizmoEnabled?: boolean;
  poseGizmoMode?: 'translate' | 'rotate';
  onSelectObject?: (publicId: string | null, options: SceneSelectOptions) => void;
  onSelectFixture?: (publicId: string | null, options: SceneSelectOptions) => void;
  onObjectCommit?: (
    publicId: string,
    pose: { transform: number[]; sizeX: number | null; sizeY: number | null; sizeZ: number | null },
  ) => void;
  onFixtureCommit?: (publicId: string, pose: { transform: number[] }) => void;
};

const EMPTY_SCENE_OBJECTS: ThreeDSceneObject[] = [];
const EMPTY_PROJECT_FIXTURES: ThreeDProjectFixture[] = [];

const objectInstanceKey = (publicId: string) => `object:${publicId}`;
const fixtureInstanceKey = (publicId: string) => `fixture:${publicId}`;

const beamMesh = (root: Object3D): Mesh | undefined => {
  if (root.userData.beam instanceof Mesh) {
    return root.userData.beam;
  }
  return undefined;
};

const syncFixtureBeam = (root: Object3D, fixture: ThreeDProjectFixture): void => {
  const beam = beamMesh(root);
  if (!beam) {
    return;
  }
  if (fixture.startAddress === undefined || fixture.channelMode === undefined) {
    applyFixtureBeamAppearance(beam, { r: 0, g: 0, b: 0, strobeHz: 0 });
    return;
  }
  applyFixtureBeamAppearance(
    beam,
    fixtureBeamColor(
      { startAddress: fixture.startAddress, channelMode: fixture.channelMode },
      dmxStore.getState().channels,
    ),
  );
};

const disposeInstanceRoot = (root: Object3D): void => {
  const beam = beamMesh(root);
  if (beam) {
    disposeFixtureBeamCone(beam);
  }
};

const ThreeDRoomCanvas = ({
  environmentType,
  roomWidth,
  roomLength,
  roomHeight,
  objects = EMPTY_SCENE_OBJECTS,
  fixtures = EMPTY_PROJECT_FIXTURES,
  selectedObjectPublicId = null,
  selectedFixturePublicId = null,
  selectedObjectPublicIds,
  selectedFixturePublicIds,
  scaleGizmoEnabled = false,
  poseGizmoMode = 'translate',
  onSelectObject,
  onSelectFixture,
  onObjectCommit,
  onFixtureCommit,
}: ThreeDRoomCanvasProperties) => {
  const selectedObjectKey = (selectedObjectPublicIds ?? (selectedObjectPublicId ? [selectedObjectPublicId] : [])).join(
    ',',
  );
  const selectedFixtureKey = (
    selectedFixturePublicIds ?? (selectedFixturePublicId ? [selectedFixturePublicId] : [])
  ).join(',');
  const selectedObjectIds = useMemo(
    () => (selectedObjectKey === '' ? [] : selectedObjectKey.split(',')),
    [selectedObjectKey],
  );
  const selectedFixtureIds = useMemo(
    () => (selectedFixtureKey === '' ? [] : selectedFixtureKey.split(',')),
    [selectedFixtureKey],
  );
  const roomRef = useRef<Object3D | null>(null);
  const groundRef = useRef<Mesh | null>(null);
  const translateControlsRef = useRef<TransformControls | null>(null);
  const rotateControlsRef = useRef<TransformControls | null>(null);
  const scaleControlsRef = useRef<TransformControls | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const selectionGroupRef = useRef<Group | null>(null);
  const selectionHighlighterRef = useRef<SelectionBoxHighlighter | null>(null);
  const instancesRef = useRef(new Map<string, Group>());
  const syncBeamsRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    syncBeamsRef.current = () => {
      for (const root of instancesRef.current.values()) {
        const fixture = root.userData.beamFixture as ThreeDProjectFixture | undefined;
        if (fixture) {
          syncFixtureBeam(root, fixture);
        }
      }
    };
  }, []);
  const onSelectObjectRef = useRef(onSelectObject);
  const onSelectFixtureRef = useRef(onSelectFixture);
  const onObjectCommitRef = useRef(onObjectCommit);
  const onFixtureCommitRef = useRef(onFixtureCommit);
  const dimensionsRef = useRef({ roomWidth, roomLength, roomHeight });
  const frameObjectRef = useRef<ThreeCanvasContext['frameObject'] | null>(null);

  useEffect(() => {
    onSelectObjectRef.current = onSelectObject;
    onSelectFixtureRef.current = onSelectFixture;
    onObjectCommitRef.current = onObjectCommit;
    onFixtureCommitRef.current = onFixtureCommit;
  }, [onSelectObject, onSelectFixture, onObjectCommit, onFixtureCommit]);

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
      const unsubscribeDmx = dmxStore.subscribe(() => {
        syncBeamsRef.current();
      });
      const selectionGroup = new Group();
      selectionGroup.userData.isSelectionGroup = true;
      scene.add(selectionGroup);
      selectionGroupRef.current = selectionGroup;
      const selectionHighlighter = new SelectionBoxHighlighter(scene);
      selectionHighlighterRef.current = selectionHighlighter;
      let highlightFrame = 0;
      const tickSelectionHighlights = () => {
        highlightFrame = requestAnimationFrame(tickSelectionHighlights);
        selectionHighlighter.update();
      };
      tickSelectionHighlights();

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

      const commitMemberPose = (target: Object3D) => {
        const visual = target.getObjectByName('visual');
        if (!visual) {
          return;
        }
        const objectPublicId = target.userData.project3dObjectId as string | undefined;
        if (typeof objectPublicId === 'string') {
          const pose = bakeInstancePose(target, visual, Boolean(target.userData.isScalable));
          onObjectCommitRef.current?.(objectPublicId, pose);
          return;
        }
        const fixturePublicId = target.userData.projectFixtureId as string | undefined;
        if (typeof fixturePublicId === 'string') {
          const pose = bakeInstancePose(target, visual, false);
          onFixtureCommitRef.current?.(fixturePublicId, { transform: pose.transform });
        }
      };

      const commitMemberWorldPose = (target: Object3D) => {
        const visual = target.getObjectByName('visual');
        if (!visual) {
          return;
        }
        const transform = bakeWorldTranslationRotation(target);
        const objectPublicId = target.userData.project3dObjectId as string | undefined;
        if (typeof objectPublicId === 'string') {
          const isScalable = Boolean(target.userData.isScalable);
          onObjectCommitRef.current?.(objectPublicId, {
            transform,
            sizeX: isScalable ? visual.scale.x : null,
            sizeY: isScalable ? visual.scale.y : null,
            sizeZ: isScalable ? visual.scale.z : null,
          });
          return;
        }
        const fixturePublicId = target.userData.projectFixtureId as string | undefined;
        if (typeof fixturePublicId === 'string') {
          onFixtureCommitRef.current?.(fixturePublicId, { transform });
        }
      };

      const commitGizmoPose = (transformControls: TransformControls) => {
        const object = transformControls.object;
        if (object.userData.isSelectionGroup) {
          for (const child of [...object.children]) {
            commitMemberWorldPose(child);
          }
          return;
        }
        commitMemberPose(object);
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
        const picked = pickClosestSceneObject(raycaster, roots);
        const options = { additive: event.shiftKey || event.ctrlKey || event.metaKey };
        if (typeof picked?.userData.projectFixtureId === 'string') {
          onSelectFixtureRef.current?.(picked.userData.projectFixtureId, options);
          return;
        }
        if (typeof picked?.userData.project3dObjectId === 'string') {
          onSelectObjectRef.current?.(picked.userData.project3dObjectId, options);
          return;
        }
        onSelectObjectRef.current?.(null, { additive: false });
      };
      host.addEventListener('pointerdown', onPointerDown);
      host.addEventListener('pointerup', onPointerUp);

      return () => {
        unsubscribeDmx();
        cancelAnimationFrame(poseSyncFrame);
        cancelAnimationFrame(highlightFrame);
        selectionHighlighter.dispose();
        selectionHighlighterRef.current = null;
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
          disposeInstanceRoot(root);
          scene.remove(root);
        }
        instanceRoots.clear();
        roomRef.current = null;
        groundRef.current = null;
        translateControlsRef.current = null;
        rotateControlsRef.current = null;
        scaleControlsRef.current = null;
        if (selectionGroupRef.current) {
          scene.remove(selectionGroupRef.current);
        }
        selectionGroupRef.current = null;
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

    const known = new Set([
      ...objects.map(object => objectInstanceKey(object.publicId)),
      ...fixtures.map(fixture => fixtureInstanceKey(fixture.publicId)),
    ]);
    for (const [instanceKey, root] of instancesRef.current) {
      if (!known.has(instanceKey)) {
        disposeInstanceRoot(root);
        scene.remove(root);
        instancesRef.current.delete(instanceKey);
      }
    }

    const isGizmoDragging = () =>
      [translateControlsRef, rotateControlsRef, scaleControlsRef].some(ref => ref.current?.dragging);
    const selectionGroup = selectionGroupRef.current;
    if (selectionGroup && !isGizmoDragging()) {
      releaseSelectionGroup(selectionGroup, scene);
    }

    for (const object of objects) {
      const instanceKey = objectInstanceKey(object.publicId);
      let root = instancesRef.current.get(instanceKey);
      if (!root) {
        root = new Group();
        root.userData.project3dObjectId = object.publicId;
        instancesRef.current.set(instanceKey, root);
        if (object.sceneObjectType.geometryKind === SceneObjectGeometryKind.Box) {
          const mesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ color: 0x8b5a2b }));
          mesh.name = 'visual';
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          root.add(mesh);
        } else if (object.sceneObjectType.modelPath) {
          const loader = new GLTFLoader();
          const capturedRoot = root;
          loader.load(sceneAssetUrl(object.sceneObjectType.modelPath), gltf => {
            if (!instancesRef.current.has(instanceKey)) {
              return;
            }
            gltf.scene.name = 'visual';
            applyMeshShadowFlags(gltf.scene, { castShadow: true, receiveShadow: true });
            capturedRoot.add(gltf.scene);
          });
        }
      }
      syncInstanceParent(scene, root, selectionGroup);
      root.userData.isScalable = object.sceneObjectType.isScalable;
      if (!(selectionGroup && root.parent === selectionGroup)) {
        applyTransformMatrix(root, object.transform);
        const visual = root.getObjectByName('visual');
        if (visual) {
          applyVisualSize(visual, object);
        }
      }
    }

    for (const fixture of fixtures) {
      const instanceKey = fixtureInstanceKey(fixture.publicId);
      let root = instancesRef.current.get(instanceKey);
      if (!root) {
        root = new Group();
        root.userData.projectFixtureId = fixture.publicId;
        const beam = createFixtureBeamCone();
        root.userData.beam = beam;
        root.add(beam);
        instancesRef.current.set(instanceKey, root);
        const loader = new GLTFLoader();
        const capturedRoot = root;
        const modelUrl = fixtureAssetDisplayUrl(fixture.fixture.model3dPath, FIXTURE_DEFAULT_MODEL_3D_PATH);
        loader.load(modelUrl, gltf => {
          if (!instancesRef.current.has(instanceKey)) {
            return;
          }
          gltf.scene.name = 'visual';
          prepareFixtureModelForPreview(gltf.scene);
          capturedRoot.add(gltf.scene);
        });
      }
      syncInstanceParent(scene, root, selectionGroup);
      root.userData.isScalable = false;
      if (!(selectionGroup && root.parent === selectionGroup)) {
        applyTransformMatrix(root, fixture.transform);
      }
      root.userData.beamFixture = fixture;
      syncFixtureBeam(root, fixture);
    }
  }, [objects, fixtures, selectedObjectIds, selectedFixtureIds]);

  useEffect(() => {
    const translateControls = translateControlsRef.current;
    const rotateControls = rotateControlsRef.current;
    const scaleControls = scaleControlsRef.current;
    const scene = sceneRef.current;
    const selectionGroup = selectionGroupRef.current;
    if (!translateControls || !rotateControls || !scaleControls || !scene || !selectionGroup) {
      return;
    }
    if ([translateControls, rotateControls, scaleControls].some(controls => controls.dragging)) {
      return;
    }
    releaseSelectionGroup(selectionGroup, scene);
    const members = [
      ...selectedObjectIds.map(publicId => instancesRef.current.get(objectInstanceKey(publicId))),
      ...selectedFixtureIds.map(publicId => instancesRef.current.get(fixtureInstanceKey(publicId))),
    ].filter((root): root is Group => Boolean(root));
    const attachPoseGizmo = (target: Object3D) => {
      if (poseGizmoMode === 'translate') {
        translateControls.attach(target);
        rotateControls.detach();
      } else {
        translateControls.detach();
        rotateControls.attach(target);
      }
    };
    selectionHighlighterRef.current?.setTargets(members);
    if (members.length === 0) {
      translateControls.detach();
      rotateControls.detach();
      scaleControls.detach();
      return;
    }
    if (members.length === 1) {
      const selected = members[0];
      if (!selected) {
        return;
      }
      attachPoseGizmo(selected);
      if (scaleGizmoEnabled && Boolean(selected.userData.isScalable)) {
        scaleControls.attach(selected);
      } else {
        scaleControls.detach();
      }
      return;
    }
    placeSelectionGroup(selectionGroup, members);
    attachPoseGizmo(selectionGroup);
    scaleControls.detach();
  }, [selectedObjectIds, selectedFixtureIds, scaleGizmoEnabled, poseGizmoMode, objects, fixtures]);

  const onFrame = useCallback((timeSec: number) => {
    for (const root of instancesRef.current.values()) {
      const beam = beamMesh(root);
      if (beam) {
        updateFixtureBeamStrobe(beam, timeSec);
      }
    }
  }, []);

  return (
    <ThreeCanvas
      className={classes.host}
      testId="three-d-room-canvas"
      showOrientationGizmo
      onFrame={onFrame}
      onReady={onReady}
    />
  );
};

export default ThreeDRoomCanvas;
