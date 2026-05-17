import { Module } from '@nestjs/common';
import { UsbModule } from '../usb/usb.module';
import { DmxSnifferCommand } from './dmx-sniffer.command';

@Module({
  imports: [UsbModule],
  providers: [DmxSnifferCommand],
  exports: [DmxSnifferCommand],
})
export class DmxModule {}
