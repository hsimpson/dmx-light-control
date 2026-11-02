import { EventsModule } from '@/events/events.module';
import { Module } from '@nestjs/common';
import { MidiService } from './midi.service';

@Module({
  imports: [EventsModule],
  providers: [MidiService],
  exports: [MidiService],
})
export class MidiModule {}
