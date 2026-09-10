'use client';

import { type CSSProperties, useEffect, useRef } from 'react';
import {
  ACESFilmicToneMapping,
  AmbientLight,
  Color,
  DirectionalLight,
  HemisphereLight,
  type Object3D,
  PCFShadowMap,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createAxisOrientationGizmo } from './axis-orientation-gizmo';
import { frameCameraOnObject } from './frame-camera';
import { createSceneAoComposer } from './scene-ao-composer';

export type ThreeCanvasContext = {
  host: HTMLDivElement;
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  controls: OrbitControls;
  frameObject: (object: Object3D) => void;
};

const KEY_SHADOW_MAP_SIZE = 2048;
const KEY_SHADOW_CAMERA_EXTENT_M = 22;
const KEY_SHADOW_CAMERA_NEAR_M = 0.5;
const KEY_SHADOW_CAMERA_FAR_M = 50;
const KEY_SHADOW_BIAS = -0.0002;
const KEY_SHADOW_NORMAL_BIAS_M = 0.04;
const KEY_SHADOW_RADIUS = 4;

export type ThreeCanvasProperties = {
  className?: string;
  style?: CSSProperties;
  testId?: string;
  showOrientationGizmo?: boolean;
  onReady: (ctx: ThreeCanvasContext) => (() => void) | undefined;
};

const ThreeCanvas = ({ className, style, testId, showOrientationGizmo = false, onReady }: ThreeCanvasProperties) => {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const scene = new Scene();
    scene.background = new Color(0x1a1b1e);

    const camera = new PerspectiveCamera(50, 1, 0.1, 1000);

    const renderer = new WebGLRenderer({ antialias: true });
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.6;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFShadowMap;
    renderer.setPixelRatio(window.devicePixelRatio);
    host.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';

    const environment = new RoomEnvironment();
    const pmrem = new PMREMGenerator(renderer);
    const environmentMap = pmrem.fromScene(environment, 0.04).texture;
    environment.dispose();
    scene.environment = environmentMap;

    const ambient = new AmbientLight(0xffffff, 0.32);
    const hemi = new HemisphereLight(0xd7e3f2, 0x1a1b1e, 0.7);
    const key = new DirectionalLight(0xffffff, 1.65);
    key.position.set(6, 10, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(KEY_SHADOW_MAP_SIZE, KEY_SHADOW_MAP_SIZE);
    key.shadow.radius = KEY_SHADOW_RADIUS;
    key.shadow.blurSamples = 8;
    key.shadow.bias = KEY_SHADOW_BIAS;
    key.shadow.normalBias = KEY_SHADOW_NORMAL_BIAS_M;
    key.shadow.camera.left = -KEY_SHADOW_CAMERA_EXTENT_M;
    key.shadow.camera.right = KEY_SHADOW_CAMERA_EXTENT_M;
    key.shadow.camera.top = KEY_SHADOW_CAMERA_EXTENT_M;
    key.shadow.camera.bottom = -KEY_SHADOW_CAMERA_EXTENT_M;
    key.shadow.camera.near = KEY_SHADOW_CAMERA_NEAR_M;
    key.shadow.camera.far = KEY_SHADOW_CAMERA_FAR_M;
    key.shadow.camera.updateProjectionMatrix();
    const fill = new DirectionalLight(0xc8d4e8, 0.55);
    fill.position.set(-5, 4, 7);
    fill.castShadow = false;
    scene.add(ambient, hemi, key, key.target, fill);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const frameObject = (object: Object3D) => {
      frameCameraOnObject(camera, controls, object);
    };

    const extraCleanup = onReady({
      host,
      scene,
      camera,
      renderer,
      controls,
      frameObject,
    });

    const orientationGizmo = showOrientationGizmo ? createAxisOrientationGizmo() : undefined;
    const aoComposer = createSceneAoComposer(renderer, scene, camera);

    const resize = () => {
      const width = host.clientWidth;
      const height = Math.max(host.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      aoComposer.setSize(width, height);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    renderer.setAnimationLoop(() => {
      controls.update();
      aoComposer.render();
      if (orientationGizmo) {
        const previousAutoClear = renderer.autoClear;
        renderer.autoClear = false;
        orientationGizmo.updateFrom(camera);
        orientationGizmo.render(renderer, host.clientWidth, Math.max(host.clientHeight, 1));
        renderer.autoClear = previousAutoClear;
      }
    });

    return () => {
      extraCleanup?.();
      orientationGizmo?.dispose();
      resizeObserver.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      aoComposer.dispose();
      environmentMap.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, [onReady, showOrientationGizmo]);

  return <div ref={hostRef} className={className} style={style} data-testid={testId} />;
};

export default ThreeCanvas;
