import { AppEventEmitter } from '@/events/app-event-emitter';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DmxUniverseService } from './dmx-universe.service';
import { type DmxWsSocket, setDmxWebsocketConnectionHandler } from './dmx-websocket.connection';
import { dmxWsDeltaMessage, dmxWsSnapshotMessage, parseDmxWsSetMessage } from './dmx-ws.protocol';

function rawDataToString(raw: Buffer | string): string {
  return typeof raw === 'string' ? raw : raw.toString('utf8');
}

@Injectable()
export class DmxWebsocketService implements OnModuleInit, OnModuleDestroy {
  private readonly sockets = new Set<DmxWsSocket>();

  public constructor(
    private readonly universe: DmxUniverseService,
    private readonly eventEmitter: AppEventEmitter,
  ) {}

  public onModuleInit(): void {
    setDmxWebsocketConnectionHandler(socket => {
      this.addClient(socket);
    });
    this.eventEmitter.on('dmx.channelValues', values => {
      this.broadcastDelta(values);
    });
  }

  public onModuleDestroy(): void {
    setDmxWebsocketConnectionHandler(undefined);
    for (const socket of this.sockets) {
      socket.close();
    }
    this.sockets.clear();
  }

  private addClient(socket: DmxWsSocket): void {
    this.sockets.add(socket);
    socket.send(JSON.stringify(dmxWsSnapshotMessage(this.universe.snapshot())));
    socket.on('message', raw => {
      this.onSocketMessage(raw);
    });
    socket.on('close', () => {
      this.sockets.delete(socket);
    });
  }

  private onSocketMessage(raw: Buffer | string): void {
    const parsed = parseDmxWsSetMessage(rawDataToString(raw));
    if (!parsed) {
      return;
    }
    const applied = this.universe.apply(parsed);
    this.eventEmitter.emit('dmx.channelValues', applied);
  }

  private broadcastDelta(values: { channel: number; value: number }[]): void {
    if (values.length === 0) {
      return;
    }
    const payload = JSON.stringify(dmxWsDeltaMessage(values));
    for (const socket of this.sockets) {
      if (socket.readyState === socket.OPEN) {
        socket.send(payload);
      }
    }
  }
}
