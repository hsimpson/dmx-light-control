import { PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createSceneAoComposer,
  SCENE_COMPOSER_MSAA_SAMPLES,
  SCENE_GTAO_BLEND_INTENSITY,
  SCENE_GTAO_DENOISE_PARAMETERS,
  SCENE_GTAO_PARAMETERS,
} from './scene-ao-composer';

const composerCtor = vi.fn();
const addPass = vi.fn();
const composerRender = vi.fn();
const composerSetSize = vi.fn();
const composerDispose = vi.fn();
const gtaoDispose = vi.fn();
const smaaDispose = vi.fn();
const outputDispose = vi.fn();
const updateGtaoMaterial = vi.fn();
const updatePdMaterial = vi.fn();

vi.mock('three/examples/jsm/postprocessing/EffectComposer.js', () => ({
  EffectComposer: class {
    public addPass = addPass;
    public render = composerRender;
    public setSize = composerSetSize;
    public dispose = composerDispose;

    public constructor(renderer: unknown, renderTarget: unknown) {
      composerCtor(renderer, renderTarget);
    }
  },
}));

vi.mock('three/examples/jsm/postprocessing/RenderPass.js', () => ({
  RenderPass: class {
    public constructor(
      public readonly scene: unknown,
      public readonly camera: unknown,
    ) {}
  },
}));

vi.mock('three/examples/jsm/postprocessing/GTAOPass.js', () => {
  class GTAOPass {
    public static readonly OUTPUT = {
      Off: -1,
      Default: 0,
      Diffuse: 1,
      Depth: 2,
      Normal: 3,
      AO: 4,
      Denoise: 5,
    };

    public output = GTAOPass.OUTPUT.Off;
    public blendIntensity = 1;
    public updateGtaoMaterial = updateGtaoMaterial;
    public updatePdMaterial = updatePdMaterial;
    public dispose = gtaoDispose;

    public constructor(
      public readonly scene: unknown,
      public readonly camera: unknown,
    ) {}
  }

  return { GTAOPass };
});

vi.mock('three/examples/jsm/postprocessing/SMAAPass.js', () => ({
  SMAAPass: class {
    public readonly kind = 'smaa';
    public dispose = smaaDispose;
  },
}));

vi.mock('three/examples/jsm/postprocessing/OutputPass.js', () => ({
  OutputPass: class {
    public readonly kind = 'output';
    public dispose = outputDispose;
  },
}));

describe('createSceneAoComposer', () => {
  beforeEach(() => {
    composerCtor.mockClear();
    addPass.mockClear();
    composerRender.mockClear();
    composerSetSize.mockClear();
    composerDispose.mockClear();
    gtaoDispose.mockClear();
    smaaDispose.mockClear();
    outputDispose.mockClear();
    updateGtaoMaterial.mockClear();
    updatePdMaterial.mockClear();
  });

  it('wires GTAO between the beauty pass and tone-mapping output', () => {
    const renderer = { capabilities: { maxSamples: 8 } } as WebGLRenderer;
    const scene = new Scene();
    const camera = new PerspectiveCamera();

    const composer = createSceneAoComposer(renderer, scene, camera);

    expect(addPass).toHaveBeenCalledTimes(4);
    expect(addPass.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        output: 0,
        blendIntensity: SCENE_GTAO_BLEND_INTENSITY,
      }),
    );
    expect(addPass.mock.calls[2]?.[0]).toEqual(expect.objectContaining({ kind: 'smaa' }));
    expect(addPass.mock.calls[3]?.[0]).toEqual(expect.objectContaining({ kind: 'output' }));
    expect(updateGtaoMaterial).toHaveBeenCalledWith(SCENE_GTAO_PARAMETERS);
    expect(updatePdMaterial).toHaveBeenCalledWith(SCENE_GTAO_DENOISE_PARAMETERS);

    composer.setSize(800, 600);
    composer.render();
    composer.dispose();

    expect(composerSetSize).toHaveBeenCalledWith(800, 600);
    expect(composerRender).toHaveBeenCalled();
    expect(gtaoDispose).toHaveBeenCalled();
    expect(smaaDispose).toHaveBeenCalled();
    expect(outputDispose).toHaveBeenCalled();
    expect(composerDispose).toHaveBeenCalled();
  });

  it('uses a multisampled composer buffer so canvas MSAA is not lost to postprocessing', () => {
    const renderer = { capabilities: { maxSamples: 8 } } as WebGLRenderer;
    const scene = new Scene();
    const camera = new PerspectiveCamera();

    createSceneAoComposer(renderer, scene, camera);

    expect(composerCtor).toHaveBeenCalledTimes(1);
    const renderTarget = composerCtor.mock.calls[0]?.[1] as { samples: number; type: number } | undefined;
    expect(renderTarget?.samples).toBe(SCENE_COMPOSER_MSAA_SAMPLES);
  });

  it('uses maxSamples from the renderer when available', () => {
    const renderer = { capabilities: { maxSamples: 4 } } as WebGLRenderer;
    const scene = new Scene();
    const camera = new PerspectiveCamera();

    createSceneAoComposer(renderer, scene, camera);

    const renderTarget = composerCtor.mock.calls[0]?.[1] as { samples: number } | undefined;
    expect(renderTarget?.samples).toBe(4);
  });

  it('falls back when maxSamples is missing', () => {
    const renderer = { capabilities: { maxSamples: 0 } } as WebGLRenderer;
    const scene = new Scene();
    const camera = new PerspectiveCamera();

    createSceneAoComposer(renderer, scene, camera);

    const renderTarget = composerCtor.mock.calls[0]?.[1] as { samples: number } | undefined;
    expect(renderTarget?.samples).toBe(SCENE_COMPOSER_MSAA_SAMPLES);
  });
});
