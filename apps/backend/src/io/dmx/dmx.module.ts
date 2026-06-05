import { EventsModule } from '@/events/events.module';
import { UsbModule } from '@/io/usb/usb.module';
import { Module } from '@nestjs/common';
import { DmxSendService } from './dmx-send.service';
import { DmxSnifferCommand } from './dmx-sniffer.command';
import { DmxSnifferService } from './dmx-sniffer.service';
import { DmxResolver } from './dmx.resolver';

@Module({
  imports: [UsbModule, EventsModule],
  providers: [DmxSendService, DmxSnifferCommand, DmxSnifferService, DmxResolver],
  exports: [DmxSnifferCommand],
})
export class DmxModule {}
