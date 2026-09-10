import { EventsModule } from '@/events/events.module';
import { UsbModule } from '@/io/usb/usb.module';
import { Module } from '@nestjs/common';
import { SerialSendService } from '../serial/serial-send.service';
import { DmxSnifferCommand } from './dmx-sniffer.command';
import { DmxSnifferService } from './dmx-sniffer.service';
import { DmxResolver } from './dmx.resolver';
import { DmxSendService } from './dmx-send.service';
import { DmxUniverseService } from './dmx-universe.service';
import { DmxWebsocketService } from './dmx-websocket.service';

@Module({
  imports: [UsbModule, EventsModule],
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
