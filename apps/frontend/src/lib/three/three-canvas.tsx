'use client';

import { type CSSProperties, useEffect, useRef } from 'react';
import {
  ACESFilmicToneMapping,
  AmbientLight,
  Color,
  DirectionalLight,
  HemisphereLight,
  type Object3D,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { frameCameraOnObject } from './frame-camera';

export type ThreeCanvasContext = {
  host: HTMLDivElement;
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  controls: OrbitControls;
  frameObject: (object: Object3D) => void;
};

export type ThreeCanvasProperties = {
  className?: string;
  style?: CSSProperties;
  testId?: string;
  onReady: (ctx: ThreeCanvasContext) => (() => void) | undefined;
};

const ThreeCanvas = ({ className, style, testId, onReady }: ThreeCanvasProperties) => {
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
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(window.devicePixelRatio);
    host.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';

    const environment = new RoomEnvironment();
    const pmrem = new PMREMGenerator(renderer);
    const environmentMap = pmrem.fromScene(environment, 0.04).texture;
    environment.dispose();
    scene.environment = environmentMap;

    const ambient = new AmbientLight(0xffffff, 0.45);
    const hemi = new HemisphereLight(0xd7e3f2, 0x1a1b1e, 0.7);
    const key = new DirectionalLight(0xffffff, 1.6);
    key.position.set(6, 10, 8);
    const fill = new DirectionalLight(0xc8d4e8, 0.55);
    fill.position.set(-5, 4, 7);
    scene.add(ambient, hemi, key, fill);

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

    const resize = () => {
      const width = host.clientWidth;
      const height = Math.max(host.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
    });

    return () => {
      extraCleanup?.();
      resizeObserver.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      environmentMap.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, [onReady]);

  return <div ref={hostRef} className={className} style={style} data-testid={testId} />;
};

export default ThreeCanvas;
