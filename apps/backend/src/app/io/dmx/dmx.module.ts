import { Module } from '@nestjs/common';
import { UsbModule } from '../usb/usb.module';
import { DmxSnifferCommand } from './dmx-sniffer.command';
import { DmxSnifferService } from './dmx-sniffer.service';

@Module({
  imports: [UsbModule],
  providers: [DmxSnifferCommand, DmxSnifferService],
  exports: [DmxSnifferCommand],
})
export class DmxModule {}
