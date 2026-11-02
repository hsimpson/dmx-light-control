import { AppEventEmitter } from '@/events/app-event-emitter';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DmxUniverseService } from './dmx-universe.service';
import { type DmxWsSocket, setDmxWebsocketConnectionHandler } from './dmx-websocket.connection';
import {
  dmxWsControlStateMessage,
  dmxWsDeltaMessage,
  dmxWsFunctionStateMessage,
  dmxWsMidiInputMessage,
  dmxWsSnapshotMessage,
  parseDmxWsClientMessage,
} from './dmx-ws.protocol';

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
    this.eventEmitter.on('function.state', payload => {
      this.broadcast(JSON.stringify(dmxWsFunctionStateMessage(payload.running)));
    });
    this.eventEmitter.on('virtualConsole.state', ({ values }) => {
      this.broadcast(JSON.stringify(dmxWsControlStateMessage(values)));
    });
    // Raw MIDI input lets the mapping editor learn a control's address.
    this.eventEmitter.on('midi.inputMessage', ({ portName, message }) => {
      this.broadcast(JSON.stringify(dmxWsMidiInputMessage(portName, message)));
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
    this.eventEmitter.emit('function.state.request');
    this.eventEmitter.emit('virtualConsole.state.request');
    // Controls this client holds (last value > 0); released when it disconnects so flash buttons don't stick.
    const held = new Set<string>();
    socket.on('message', raw => {
      this.onSocketMessage(raw, held);
    });
    socket.on('close', () => {
      this.sockets.delete(socket);
      if (held.size > 0) {
        this.eventEmitter.emit('virtualConsole.inputsReleased', { controlIds: [...held] });
      }
    });
  }

  private onSocketMessage(raw: Buffer | string, held: Set<string>): void {
    const parsed = parseDmxWsClientMessage(rawDataToString(raw));
    if (!parsed) {
      return;
    }
    switch (parsed.type) {
      case 'functionStart':
      case 'functionStop':
        this.eventEmitter.emit(parsed.type === 'functionStart' ? 'function.start' : 'function.stop', {
          functionPublicId: parsed.functionPublicId,
        });
        return;
      case 'controlValue':
        if (parsed.value > 0) {
          held.add(parsed.controlId);
        } else {
          held.delete(parsed.controlId);
        }
        this.eventEmitter.emit('virtualConsole.input', { controlId: parsed.controlId, value: parsed.value });
        return;
      case 'set': {
        const applied = this.universe.apply(parsed.values);
        this.eventEmitter.emit('dmx.channelValues', applied);
        return;
      }
    }
  }

  private broadcastDelta(values: { channel: number; value: number }[]): void {
    if (values.length === 0) {
      return;
    }
    this.broadcast(JSON.stringify(dmxWsDeltaMessage(values)));
  }

  private broadcast(payload: string): void {
    for (const socket of this.sockets) {
      if (socket.readyState === socket.OPEN) {
        socket.send(payload);
      }
    }
  }
}
