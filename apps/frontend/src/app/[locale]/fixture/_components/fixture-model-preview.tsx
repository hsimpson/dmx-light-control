'use client';

import { useEffect, useRef } from 'react';
import { AmbientLight, DirectionalLight, PerspectiveCamera, Scene, SRGBColorSpace, WebGLRenderer } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

type FixtureModelPreviewProperties = {
  url: string;
};

const FixtureModelPreview = ({ url }: FixtureModelPreviewProperties) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.setSize(canvas.clientWidth || 240, canvas.clientHeight || 160, false);

    const scene = new Scene();
    const camera = new PerspectiveCamera(35, 1.5, 0.01, 100);
    camera.position.set(0.6, 0.5, 0.8);
    camera.lookAt(0, 0.2, 0);
    scene.add(new AmbientLight(0xffffff, 0.8));
    const directional = new DirectionalLight(0xffffff, 0.8);
    directional.position.set(1, 2, 1);
    scene.add(directional);

    const loader = new GLTFLoader();
    let cancelled = false;
    loader.load(url, gltf => {
      if (cancelled) {
        return;
      }
      scene.add(gltf.scene);
      renderer.render(scene, camera);
    });

    return () => {
      cancelled = true;
      renderer.dispose();
    };
  }, [url]);

  return <canvas ref={canvasRef} width={240} height={160} style={{ width: '100%', height: 160 }} />;
};

export default FixtureModelPreview;
