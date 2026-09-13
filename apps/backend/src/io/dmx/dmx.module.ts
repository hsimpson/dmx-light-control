import { EventsModule } from '@/events/events.module';
import { Module } from '@nestjs/common';
import { SerialSendService } from '../serial/serial-send.service';
import { DmxSendService } from './dmx-send.service';
import { DmxSnifferCommand } from './dmx-sniffer.command';
import { DmxSnifferService } from './dmx-sniffer.service';
import { DmxUniverseService } from './dmx-universe.service';
import { DmxWebsocketService } from './dmx-websocket.service';
import { DmxResolver } from './dmx.resolver';

@Module({
  imports: [EventsModule],
  providers: [
    DmxSnifferCommand,
    DmxSnifferService,
    DmxResolver,
    DmxSendService,
    DmxUniverseService,
    DmxWebsocketService,
    SerialSendService,
  ],
  exports: [DmxSnifferCommand],
})
export class DmxModule {}
