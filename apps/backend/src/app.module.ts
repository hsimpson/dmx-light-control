import { DmxModule } from '@/io/dmx/dmx.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MidiModule } from './io/midi/midi.module';

@Module({
  imports: [DmxModule, MidiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
