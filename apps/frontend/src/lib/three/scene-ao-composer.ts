import { type Camera, HalfFloatType, type Scene, type WebGLRenderer, WebGLRenderTarget } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';

export const SCENE_COMPOSER_MSAA_SAMPLES = 8;

export const SCENE_GTAO_BLEND_INTENSITY = 0.68;

export const SCENE_GTAO_PARAMETERS = {
  radius: 0.28,
  distanceExponent: 2,
  thickness: 1,
  distanceFallOff: 1,
  scale: 1.05,
  samples: 16,
  screenSpaceRadius: false,
} as const;

export const SCENE_GTAO_DENOISE_PARAMETERS = {
  lumaPhi: 10,
  depthPhi: 2,
  normalPhi: 3,
  radius: 8,
  radiusExponent: 2,
  rings: 2,
  samples: 16,
} as const;

export type SceneAoComposer = {
  render: () => void;
  setSize: (width: number, height: number) => void;
  dispose: () => void;
};

export const createSceneAoComposer = (renderer: WebGLRenderer, scene: Scene, camera: Camera): SceneAoComposer => {
  const samples = Math.min(
    SCENE_COMPOSER_MSAA_SAMPLES,
    renderer.capabilities.maxSamples || SCENE_COMPOSER_MSAA_SAMPLES,
  );
  const composer = new EffectComposer(renderer, new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples }));
  const renderPass = new RenderPass(scene, camera);
  const gtaoPass = new GTAOPass(scene, camera);
  const smaaPass = new SMAAPass();
  const outputPass = new OutputPass();

  gtaoPass.output = GTAOPass.OUTPUT.Default;
  gtaoPass.blendIntensity = SCENE_GTAO_BLEND_INTENSITY;
  gtaoPass.updateGtaoMaterial(SCENE_GTAO_PARAMETERS);
  gtaoPass.updatePdMaterial(SCENE_GTAO_DENOISE_PARAMETERS);

  composer.addPass(renderPass);
  composer.addPass(gtaoPass);
  composer.addPass(smaaPass);
  composer.addPass(outputPass);

  return {
    render: () => {
      composer.render();
    },
    setSize: (width, height) => {
      composer.setSize(width, height);
    },
    dispose: () => {
      gtaoPass.dispose();
      smaaPass.dispose();
      outputPass.dispose();
      composer.dispose();
    },
  };
};
