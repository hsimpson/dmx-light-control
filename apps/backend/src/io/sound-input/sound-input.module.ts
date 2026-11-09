import { EventsModule } from '@/events/events.module';
import { Module } from '@nestjs/common';
import { SoundInputService } from './sound-input.service';

@Module({
  imports: [EventsModule],
  providers: [SoundInputService],
  exports: [SoundInputService],
})
export class SoundInputModule {}
