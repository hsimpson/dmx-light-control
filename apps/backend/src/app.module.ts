import { DmxModule } from '@/io/dmx/dmx.module';
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppEventEmitter } from './events/app-event-emitter';
import { IoBridgeModule } from './io/io-bridge/io-bridge.module';
import { MidiModule } from './io/midi/midi.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    DmxModule,
    MidiModule,
    IoBridgeModule,
  ],
  controllers: [AppController],
  providers: [AppService, AppEventEmitter],
  exports: [AppEventEmitter],
})
export class AppModule {}
