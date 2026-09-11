import { AppEventEmitter } from '@/events/app-event-emitter';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { DmxUniverseService } from './dmx-universe.service';

/**
 * Applies inbound channel updates (MIDI bridge) to the in-memory universe.
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
    this.eventEmitter.on('dmx.channelValues', values => {
      this.universe.apply(values);
    });
  }
}
