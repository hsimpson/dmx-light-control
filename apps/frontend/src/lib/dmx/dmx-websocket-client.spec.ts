import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDmxStore } from './dmx-store';
import { DmxWebsocketClient } from './dmx-websocket-client';

class FakeWebSocket extends EventTarget {
  public static instances: FakeWebSocket[] = [];
  public readyState = 0;
  public sent: string[] = [];

  public constructor(public readonly url: string) {
    super();
    FakeWebSocket.instances.push(this);
  }

  public send(data: string): void {
    this.sent.push(data);
  }

  public close(): void {
    this.readyState = 3;
    this.dispatchEvent(new Event('close'));
  }

  public open(): void {
    this.readyState = 1;
    this.dispatchEvent(new Event('open'));
  }

  public receive(payload: unknown): void {
    this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(payload) }));
  }
}

describe('DmxWebsocketClient', () => {
  afterEach(() => {
    vi.useRealTimers();
    FakeWebSocket.instances = [];
  });

  it('applies snapshot and delta into the store', () => {
    const store = createDmxStore();
    const client = new DmxWebsocketClient(store, 'ws://localhost/dmx', FakeWebSocket);
    client.connect();
    const socket = FakeWebSocket.instances[0];
    expect(socket).toBeDefined();
    socket?.open();
    expect(store.getState().status).toBe('open');

    const channels = Array.from({ length: 512 }, (_, index) => (index === 0 ? 10 : 0));
    socket?.receive({ type: 'snapshot', channels });
    expect(store.getState().channels[0]).toBe(10);

    socket?.receive({ type: 'delta', values: [{ channel: 2, value: 99 }] });
    expect(store.getState().channels[1]).toBe(99);
  });

  it('does not send set until a snapshot arrives', () => {
    const store = createDmxStore();
    const client = new DmxWebsocketClient(store, 'ws://localhost/dmx', FakeWebSocket);
    client.connect();
    const socket = FakeWebSocket.instances[0];
    socket?.open();
    client.setChannels([{ channel: 1, value: 1 }]);
    expect(socket?.sent).toEqual([]);

    socket?.receive({ type: 'snapshot', channels: Array.from({ length: 512 }, () => 0) });
    client.setChannels([{ channel: 1, value: 1 }]);
    expect(socket?.sent).toEqual([JSON.stringify({ type: 'set', values: [{ channel: 1, value: 1 }] })]);
  });

  it('replaces local channels on reconnect snapshot and does not push 1-512', () => {
    vi.useFakeTimers();
    const store = createDmxStore();
    const client = new DmxWebsocketClient(store, 'ws://localhost/dmx', FakeWebSocket);
    client.connect();
    const first = FakeWebSocket.instances[0];
    first?.open();
    const live = Array.from({ length: 512 }, (_, index) => (index === 0 ? 255 : 0));
    first?.receive({ type: 'snapshot', channels: live });
    expect(store.getState().channels[0]).toBe(255);

    first?.close();
    expect(store.getState().status).toBe('connecting');
    vi.advanceTimersByTime(500);
    const second = FakeWebSocket.instances[1];
    expect(second).toBeDefined();
    second?.open();
    second?.receive({ type: 'snapshot', channels: Array.from({ length: 512 }, () => 0) });
    expect(store.getState().channels[0]).toBe(0);
    expect(second?.sent).toEqual([]);
    client.disconnect();
  });
});
