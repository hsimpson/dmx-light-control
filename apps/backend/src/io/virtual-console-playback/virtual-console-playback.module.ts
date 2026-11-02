import { EventsModule } from '@/events/events.module';
import { ProjectsModule } from '@/projects/projects.module';
import { Module } from '@nestjs/common';
import { VirtualConsolePlaybackService } from './virtual-console-playback.service';

@Module({
  imports: [EventsModule, ProjectsModule],
  providers: [VirtualConsolePlaybackService],
})
export class VirtualConsolePlaybackModule {}
