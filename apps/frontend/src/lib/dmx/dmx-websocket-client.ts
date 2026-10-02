import { createDmxStore, type DmxChannelUpdate } from './dmx-store';

type DmxStoreApi = ReturnType<typeof createDmxStore>;

type SocketLike = {
  readyState: number;
  send: (data: string) => void;
  close: () => void;
  addEventListener: (type: string, listener: (event: Event) => void) => void;
};

type SocketCtor = new (url: string) => SocketLike;

const OPEN = 1;

export class DmxWebsocketClient {
  private socket: SocketLike | undefined;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private reconnectAttempt = 0;
  private sawSnapshot = false;
  private stopped = true;
  private pendingByChannel = new Map<number, number>();

  public constructor(
    private readonly store: DmxStoreApi,
    private readonly url: string,
    private readonly socketCtor: SocketCtor,
  ) {}

  public connect(): void {
    this.stopped = false;
    this.openSocket();
  }

  public disconnect(): void {
    this.stopped = true;
    this.clearReconnect();
    this.sawSnapshot = false;
    this.pendingByChannel.clear();
    if (this.socket?.readyState === OPEN) {
      this.socket.close();
    }
    this.socket = undefined;
    this.store.getState().setStatus('idle');
  }

  public setChannels(values: DmxChannelUpdate[]): void {
    if (values.length === 0) {
      return;
    }
    for (const update of values) {
      this.pendingByChannel.set(update.channel, update.value);
    }
    this.flushPendingSets();
  }

  private flushPendingSets(): void {
    if (!this.sawSnapshot || this.socket?.readyState !== OPEN || this.pendingByChannel.size === 0) {
      return;
    }
    const values = Array.from(this.pendingByChannel.entries()).map(([channel, value]) => ({ channel, value }));
    this.pendingByChannel.clear();
    this.store.getState().applyDelta(values);
    this.socket.send(JSON.stringify({ type: 'set', values }));
  }

  private openSocket(): void {
    this.sawSnapshot = false;
    this.store.getState().setStatus('connecting');
    const socket = new this.socketCtor(this.url);
    this.socket = socket;
    socket.addEventListener('open', () => {
      if (this.stopped) {
        socket.close();
        return;
      }
      this.reconnectAttempt = 0;
      this.store.getState().setStatus('open');
    });
    socket.addEventListener('message', event => {
      this.onMessage(String((event as MessageEvent).data));
    });
    socket.addEventListener('close', () => {
      this.onDisconnected();
    });
    socket.addEventListener('error', () => {
      this.store.getState().setStatus('error');
    });
  }

  private onMessage(raw: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      return;
    }
    if (typeof parsed !== 'object' || parsed === null) {
      return;
    }
    const message = parsed as { type?: unknown; channels?: unknown; values?: unknown };
    if (message.type === 'snapshot' && Array.isArray(message.channels)) {
      this.store.getState().applySnapshot(message.channels as number[]);
      this.sawSnapshot = true;
      this.flushPendingSets();
      return;
    }
    if (message.type === 'delta' && Array.isArray(message.values)) {
      this.store.getState().applyDelta(message.values as DmxChannelUpdate[]);
    }
  }

  private onDisconnected(): void {
    this.sawSnapshot = false;
    this.socket = undefined;
    if (this.stopped) {
      return;
    }
    this.store.getState().setStatus('connecting');
    const delayMs = Math.min(8000, 500 * 2 ** this.reconnectAttempt);
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.openSocket();
    }, delayMs);
  }

  private clearReconnect(): void {
    if (this.reconnectTimer !== undefined) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }
}
