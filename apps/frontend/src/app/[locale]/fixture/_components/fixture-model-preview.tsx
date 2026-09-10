'use client';

import { useEffect, useRef } from 'react';
import {
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  type Object3D,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import classes from './fixture-model-preview.module.css';

type FixtureModelPreviewProperties = {
  url: string;
};

const frameCameraOnObject = (camera: PerspectiveCamera, controls: OrbitControls, object: Object3D) => {
  const bounds = new Box3().setFromObject(object);
  if (bounds.isEmpty()) {
    return;
  }

  const center = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const fovRadians = (camera.fov * Math.PI) / 180;
  const fitDistance = maxDim / (2 * Math.tan(fovRadians / 2));
  const distance = fitDistance * 1.35;

  camera.position.set(center.x + distance * 0.6, center.y + distance * 0.25, center.z + distance * 0.8);
  camera.near = Math.max(distance / 100, 0.01);
  camera.far = Math.max(distance * 100, 100);
  camera.updateProjectionMatrix();
  controls.target.copy(center);
  controls.minDistance = distance * 0.25;
  controls.maxDistance = distance * 4;
  controls.update();
};

const FixtureModelPreview = ({ url }: FixtureModelPreviewProperties) => {
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
    renderer.setPixelRatio(window.devicePixelRatio);
    host.appendChild(renderer.domElement);

    const ambient = new AmbientLight(0xffffff, 0.28);
    const key = new DirectionalLight(0xffffff, 1.35);
    key.position.set(6, 10, 8);
    const fill = new DirectionalLight(0xc8d4e8, 0.4);
    fill.position.set(-5, 4, 7);
    scene.add(ambient, key, fill);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const loader = new GLTFLoader();
    let cancelled = false;
    loader.load(url, gltf => {
      if (cancelled) {
        return;
      }
      scene.add(gltf.scene);
      frameCameraOnObject(camera, controls, gltf.scene);
      renderer.render(scene, camera);
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
      cancelled = true;
      resizeObserver.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, [url]);

  return <div ref={hostRef} className={classes.host} data-testid="fixture-model-preview" />;
};

export default FixtureModelPreview;
