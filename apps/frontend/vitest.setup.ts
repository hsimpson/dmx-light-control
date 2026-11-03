import { resetDmxStore } from '@/lib/dmx/dmx-store';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

class ResizeObserverStub {
  public observe(): void {
    return undefined;
  }

  public unobserve(): void {
    return undefined;
  }

  public disconnect(): void {
    return undefined;
  }
}

vi.stubGlobal('ResizeObserver', ResizeObserverStub);

// Never connects: Node's undici socket would reach a locally running backend and dispatch
// events jsdom rejects. Set directly so `vi.unstubAllGlobals()` falls back to it, not the real one.
class InertWebSocket extends EventTarget {
  public readonly readyState = 0;

  public constructor(public readonly url: string) {
    super();
  }

  public send(_data: string): void {
    return undefined;
  }

  public close(): void {
    return undefined;
  }
}

Object.defineProperty(globalThis, 'WebSocket', { writable: true, configurable: true, value: InertWebSocket });

Object.defineProperty(document, 'fonts', {
  writable: true,
  value: {
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  },
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

afterEach(() => {
  cleanup();
  resetDmxStore();
});
