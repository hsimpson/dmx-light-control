import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FixtureModelPreview from './fixture-model-preview';

const load = vi.fn();

vi.mock('three', async importOriginal => {
  const actual = await importOriginal<typeof import('three')>();
  return {
    ...actual,
    WebGLRenderer: class {
      public outputColorSpace = '';
      public domElement = document.createElement('canvas');
      public setPixelRatio() {
        return undefined;
      }
      public setSize() {
        return undefined;
      }
      public setAnimationLoop() {
        return undefined;
      }
      public dispose() {
        return undefined;
      }
      public render() {
        return undefined;
      }
    },
  };
});

vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: class {
    public target = {
      copy() {
        return undefined;
      },
      set() {
        return undefined;
      },
    };
    public enableDamping = false;
    public minDistance = 0;
    public maxDistance = 0;
    public update() {
      return undefined;
    }
    public dispose() {
      return undefined;
    }
  },
}));

vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    public load = load;
  },
}));

describe('FixtureModelPreview', () => {
  class ResizeObserverMock {
    public observe() {
      return undefined;
    }
    public disconnect() {
      return undefined;
    }
    public unobserve() {
      return undefined;
    }
  }

  beforeEach(() => {
    load.mockReset();
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  });

  it('renders an interactive preview host', () => {
    renderWithProviders(<FixtureModelPreview url="/assets/fixtures/_defaults/model.glb" />);

    expect(screen.getByTestId('fixture-model-preview')).toBeInTheDocument();
    expect(load).toHaveBeenCalledWith('/assets/fixtures/_defaults/model.glb', expect.any(Function));
  });
});
