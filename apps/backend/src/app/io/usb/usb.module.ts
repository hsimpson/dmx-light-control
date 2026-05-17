import { Module } from '@nestjs/common';
import { UsbDeviceService } from './usb-device.service';

@Module({
  providers: [UsbDeviceService],
  exports: [UsbDeviceService],
})
export class UsbModule {}
