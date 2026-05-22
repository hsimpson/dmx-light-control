import { EventsModule } from '@/events/events.module';
import { Module } from '@nestjs/common';
import { MidiResolver } from './midi.resolver';
import { MidiService } from './midi.service';

@Module({
  imports: [EventsModule],
  providers: [MidiService, MidiResolver],
})
export class MidiModule {}
