import { Module } from '@nestjs/common';
import { AudioOutputService } from './audio-output.service';

@Module({
  providers: [AudioOutputService],
  exports: [AudioOutputService],
})
export class AudioOutputModule {}
