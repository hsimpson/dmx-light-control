import { AppEventEmitter } from '@/events/app-event-emitter';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { DmxUniverseService } from './dmx-universe.service';

/**
 * Applies inbound manual channel updates (MIDI bridge) to the in-memory universe.
 * Wire output is SerialSendService: FTDI Open DMX clones need UART 250k 8N2 + BREAK,
 * not WebUSB bulk transfers.
 */
@Injectable()
export class DmxSendService implements OnModuleInit {
  public constructor(
    private readonly eventEmitter: AppEventEmitter,
    private readonly universe: DmxUniverseService,
  ) {}

  public onModuleInit() {
    this.eventEmitter.on('dmx.manualValues', values => {
      const applied = this.universe.apply(values);
      if (applied.length > 0) {
        this.eventEmitter.emit('dmx.channelValues', applied);
      }
    });
  }
}
