import { Module } from '@nestjs/common';
import { AppEventEmitter } from './app-event-emitter';

@Module({
  providers: [AppEventEmitter],
  exports: [AppEventEmitter],
})
export class EventsModule {}
