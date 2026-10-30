import { EventsModule } from '@/events/events.module';
import { DmxModule } from '@/io/dmx/dmx.module';
import { MidiModule } from '@/io/midi/midi.module';
import { Module } from '@nestjs/common';
import { IO_DEVICES_SYS_ROOT, IoDeviceDiscoveryService } from './io-device-discovery.service';
import { IoDeviceManagerService } from './io-device-manager.service';
import { IoDevicesResolver } from './io-devices.resolver';
import { LINUX_SYS_ROOT } from './linux-usb-sysfs';

@Module({
  imports: [DmxModule, EventsModule, MidiModule],
  providers: [
    IoDeviceDiscoveryService,
    IoDeviceManagerService,
    IoDevicesResolver,
    { provide: IO_DEVICES_SYS_ROOT, useValue: LINUX_SYS_ROOT },
  ],
  exports: [IoDeviceManagerService],
})
export class IoDevicesModule {}
