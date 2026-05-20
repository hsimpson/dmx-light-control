import { EventsModule } from '@/events/events.module';
import { UsbModule } from '@/io/usb/usb.module';
import { Module } from '@nestjs/common';
import { DmxSendService } from './dmx-send.service';
import { DmxSnifferCommand } from './dmx-sniffer.command';
import { DmxSnifferService } from './dmx-sniffer.service';
import { DmxController } from './dmx.controller';

@Module({
  imports: [UsbModule, EventsModule],
  controllers: [DmxController],
  providers: [DmxSendService, DmxSnifferCommand, DmxSnifferService],
  exports: [DmxSnifferCommand],
})
export class DmxModule {}
