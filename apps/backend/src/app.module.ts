import { DmxModule } from '@/io/dmx/dmx.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { loadConfig } from './config/config';
import { AppEventEmitter } from './events/app-event-emitter';
import { IoBridgeModule } from './io/io-bridge/io-bridge.module';
import { MidiModule } from './io/midi/midi.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      load: [loadConfig],
    }),
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
