import { afterEach, describe, expect, it, vi } from 'vitest';
import { notifyVirtualConsoleSaved } from './virtual-console-reload';

describe('notifyVirtualConsoleSaved', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does nothing when BroadcastChannel is unavailable', () => {
    vi.stubGlobal('BroadcastChannel', undefined);
    expect(() => notifyVirtualConsoleSaved('proj-1')).not.toThrow();
  });
});
