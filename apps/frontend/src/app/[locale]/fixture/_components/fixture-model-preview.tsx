'use client';

import ThreeCanvas, { type ThreeCanvasContext } from '@/lib/three/three-canvas';
import { useCallback } from 'react';
import { Mesh, type Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import classes from './fixture-model-preview.module.css';

type FixtureModelPreviewProperties = {
  url: string;
};

type PreviewMaterial = {
  transmission?: number;
  transparent?: boolean;
  depthWrite?: boolean;
};

const isMeshObject = (object: Object3D): object is Mesh => 'isMesh' in object && object.isMesh === true;

const disableTransmission = (material: PreviewMaterial) => {
  if (typeof material.transmission !== 'number' || material.transmission <= 0) {
    return;
  }
  material.transmission = 0;
  material.transparent = false;
  material.depthWrite = true;
};

export const prepareFixtureModelForPreview = (root: Object3D) => {
  root.traverse(object => {
    if (!isMeshObject(object)) {
      return;
    }

    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      disableTransmission(material);
    }
  });
};

const FixtureModelPreview = ({ url }: FixtureModelPreviewProperties) => {
  const onReady = useCallback(
    ({ scene, frameObject }: ThreeCanvasContext) => {
      const loader = new GLTFLoader();
      let cancelled = false;
      loader.load(url, gltf => {
        if (cancelled) {
          return;
        }
        prepareFixtureModelForPreview(gltf.scene);
        scene.add(gltf.scene);
        frameObject(gltf.scene);
      });

      return () => {
        cancelled = true;
      };
    },
    [url],
  );

  return (
    <ThreeCanvas
      key={url}
      className={classes.host}
      testId="fixture-model-preview"
      showOrientationGizmo
      onReady={onReady}
    />
  );
};

export default FixtureModelPreview;
