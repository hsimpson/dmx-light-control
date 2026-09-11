import { AppEventEmitter } from '@/events/app-event-emitter';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DmxUniverseService } from './dmx-universe.service';
import { handleDmxWebsocketConnection, type DmxWsSocket } from './dmx-websocket.connection';
import { DmxWebsocketService } from './dmx-websocket.service';

class FakeSocket implements DmxWsSocket {
  public readonly OPEN = 1;
  public readyState = 1;
  public readonly sent: string[] = [];
  private readonly listeners = new Map<string, (raw: Buffer | string) => void>();

  public send(data: string): void {
    this.sent.push(data);
  }

  public on(event: 'message' | 'close', listener: (raw: Buffer | string) => void): void {
    this.listeners.set(event, listener);
  }

  public emit(event: 'message' | 'close', raw?: Buffer | string): void {
    this.listeners.get(event)?.(raw ?? Buffer.from(''));
  }

  public close(): void {
    this.readyState = 3;
    this.emit('close');
  }
}

describe('DmxWebsocketService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends a snapshot and broadcasts applied deltas to all clients', () => {
    const universe = new DmxUniverseService();
    const listeners = new Map<string, (payload: unknown) => void>();
    const eventEmitter = {
      on: (event: string, listener: (payload: unknown) => void) => {
        listeners.set(event, listener);
      },
      emit: (event: string, payload: unknown) => {
        listeners.get(event)?.(payload);
        return true;
      },
    };
    const service = new DmxWebsocketService(universe, eventEmitter as unknown as AppEventEmitter);
    service.onModuleInit();

    const clientA = new FakeSocket();
    const clientB = new FakeSocket();
    handleDmxWebsocketConnection(clientA);
    handleDmxWebsocketConnection(clientB);

    const snapshot = JSON.parse(clientA.sent[0] ?? '{}') as { type: string; channels: number[] };
    expect(snapshot.type).toBe('snapshot');
    expect(snapshot.channels).toHaveLength(512);
    expect(snapshot.channels.every(value => value === 0)).toBe(true);

    clientA.sent.length = 0;
    clientB.sent.length = 0;
    clientA.emit('message', Buffer.from(JSON.stringify({ type: 'set', values: [{ channel: 3, value: 200 }] })));

    expect(universe.getFrame()[3]).toBe(200);
    expect(clientA.sent).toEqual([JSON.stringify({ type: 'delta', values: [{ channel: 3, value: 200 }] })]);
    expect(clientB.sent).toEqual([JSON.stringify({ type: 'delta', values: [{ channel: 3, value: 200 }] })]);

    const clientC = new FakeSocket();
    handleDmxWebsocketConnection(clientC);
    const later = JSON.parse(clientC.sent[0] ?? '{}') as { channels: number[] };
    expect(later.channels[2]).toBe(200);

    service.onModuleDestroy();
  });
});
