import { Module } from '@nestjs/common';
import { UsbModule } from '../usb/usb.module';
import { DmxSendService } from './dmx-send.service';
import { DmxSnifferCommand } from './dmx-sniffer.command';
import { DmxSnifferService } from './dmx-sniffer.service';
import { DmxController } from './dmx.controller';

@Module({
  imports: [UsbModule],
  controllers: [DmxController],
  providers: [DmxSendService, DmxSnifferCommand, DmxSnifferService],
  exports: [DmxSendService, DmxSnifferCommand],
})
export class DmxModule {}
