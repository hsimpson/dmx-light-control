'use client';

import { roomGltfUrl } from '@/lib/graphql/graphql-api-origin';
import { useEffect, useRef } from 'react';
import {
  AmbientLight,
  Color,
  DirectionalLight,
  type Object3D,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { applyRoomDimensions } from './room-layout';

export type ThreeDRoomCanvasProperties = {
  roomWidth: number;
  roomLength: number;
  roomHeight: number;
};

const ThreeDRoomCanvas = ({ roomWidth, roomLength, roomHeight }: ThreeDRoomCanvasProperties) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<Object3D | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const dimensionsRef = useRef({ roomWidth, roomLength, roomHeight });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const scene = new Scene();
    scene.background = new Color(0x1a1b1e);

    const camera = new PerspectiveCamera(50, 1, 0.1, 1000);
    cameraRef.current = camera;

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
    controlsRef.current = controls;

    const applyDimensions = () => {
      const { roomWidth: width, roomLength: length, roomHeight: height } = dimensionsRef.current;
      if (roomRef.current) {
        applyRoomDimensions(roomRef.current, width, length, height);
      }
      camera.position.set(0, Math.max(height * 0.55, 3), Math.max(length * 1.4, 6));
      controls.target.set(0, height / 2, 0);
      controls.update();
    };

    const loader = new GLTFLoader();
    loader.load(roomGltfUrl(), gltf => {
      const room = gltf.scene.getObjectByName('room') ?? gltf.scene;
      roomRef.current = room;
      scene.add(gltf.scene);
      applyDimensions();
    });

    applyDimensions();

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
      resizeObserver.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      renderer.dispose();
      roomRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      if (renderer.domElement.parentElement === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    dimensionsRef.current = { roomWidth, roomLength, roomHeight };
    if (roomRef.current) {
      applyRoomDimensions(roomRef.current, roomWidth, roomLength, roomHeight);
    }
    cameraRef.current?.position.set(0, Math.max(roomHeight * 0.55, 3), Math.max(roomLength * 1.4, 6));
    if (controlsRef.current) {
      controlsRef.current.target.set(0, roomHeight / 2, 0);
      controlsRef.current.update();
    }
  }, [roomWidth, roomLength, roomHeight]);

  return (
    <div
      ref={hostRef}
      data-testid="three-d-room-canvas"
      style={{ display: 'block', flex: 1, width: '100%', height: '100%', minHeight: 0 }}
    />
  );
};

export default ThreeDRoomCanvas;
