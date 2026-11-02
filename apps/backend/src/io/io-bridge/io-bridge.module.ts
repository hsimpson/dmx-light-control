import { EventsModule } from '@/events/events.module';
import { IoDevicesModule } from '@/io/devices/io-devices.module';
import { MidiMappingsModule } from '@/midi-mappings/midi-mappings.module';
import { Module } from '@nestjs/common';
import { IoBridgeService } from './io-bridge.service';

@Module({
  imports: [EventsModule, IoDevicesModule, MidiMappingsModule],
  providers: [IoBridgeService],
})
export class IoBridgeModule {}
