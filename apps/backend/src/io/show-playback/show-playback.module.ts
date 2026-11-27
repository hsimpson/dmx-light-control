import { EventsModule } from '@/events/events.module';
import { AudioOutputModule } from '@/io/audio-output/audio-output.module';
import { ShowsModule } from '@/shows/shows.module';
import { Module } from '@nestjs/common';
import { ShowPlaybackService } from './show-playback.service';

@Module({
  imports: [AudioOutputModule, EventsModule, ShowsModule],
  providers: [ShowPlaybackService],
})
export class ShowPlaybackModule {}
