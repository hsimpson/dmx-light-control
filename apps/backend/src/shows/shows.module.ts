import { FIXTURE_ASSETS_ROOT, resolveAssetsRoot } from '@/fixtures/fixture-asset-path';
import { ProjectsModule } from '@/projects/projects.module';
import { Module } from '@nestjs/common';
import { ShowAudioClipRepository } from './repositories/show-audio-clip.repository';
import { ShowRepository } from './repositories/show.repository';
import { ShowAudioController } from './show-audio.controller';
import { ShowAudioService } from './show-audio.service';
import { ShowResolver } from './show.resolver';
import { ShowService } from './show.service';

@Module({
  imports: [ProjectsModule],
  controllers: [ShowAudioController],
  providers: [
    ShowRepository,
    ShowAudioClipRepository,
    { provide: FIXTURE_ASSETS_ROOT, useFactory: () => resolveAssetsRoot() },
    ShowAudioService,
    ShowService,
    ShowResolver,
  ],
  exports: [ShowRepository, ShowAudioService],
})
export class ShowsModule {}
