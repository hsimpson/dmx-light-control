import { EventsModule } from '@/events/events.module';
import { DmxModule } from '@/io/dmx/dmx.module';
import { FunctionPlaybackService } from '@/io/function-playback/function-playback.service';
import { ProjectsModule } from '@/projects/projects.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [EventsModule, DmxModule, ProjectsModule],
  providers: [FunctionPlaybackService],
})
export class FunctionPlaybackModule {}
