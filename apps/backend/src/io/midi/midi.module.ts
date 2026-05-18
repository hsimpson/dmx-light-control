import { EventsModule } from '@/events/events.module';
import { Module } from '@nestjs/common';
import { MidiController } from './midi.controller';
import { MidiService } from './midi.service';

@Module({
  imports: [EventsModule],
  controllers: [MidiController],
  providers: [MidiService],
  exports: [MidiService],
})
export class MidiModule {}
