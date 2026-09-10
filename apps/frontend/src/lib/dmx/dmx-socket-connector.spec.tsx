import { render } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DmxSocketConnector, resetDmxSocketConnector } from './dmx-socket-connector';

class FakeWebSocket extends EventTarget {
  public static instances: FakeWebSocket[] = [];
  public readyState = 0;
  public closedWhileConnecting = false;

  public constructor(public readonly url: string) {
    super();
    FakeWebSocket.instances.push(this);
  }

  public send(_data: string): void {
    return undefined;
  }

  public close(): void {
    if (this.readyState === 0) {
      this.closedWhileConnecting = true;
    }
    this.readyState = 3;
    this.dispatchEvent(new Event('close'));
  }
}

describe('DmxSocketConnector', () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
    vi.stubEnv('NEXT_PUBLIC_GRAPHQL_API_URL', 'http://localhost:3000/graphql');
  });

  afterEach(() => {
    resetDmxSocketConnector();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('does not abort the handshake on React Strict Mode remount', () => {
    const { unmount } = render(
      <StrictMode>
        <DmxSocketConnector />
      </StrictMode>,
    );

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.instances[0]?.closedWhileConnecting).toBe(false);
    expect(FakeWebSocket.instances[0]?.url).toBe('ws://localhost:3000/dmx');

    unmount();
  });
});
