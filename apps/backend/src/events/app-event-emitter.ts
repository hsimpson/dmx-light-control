import { AppEvents } from '@/events/types/app-events';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from 'eventemitter2';
import { TypedEventEmitter } from './typed-event-emitter';

@Injectable()
export class AppEventEmitter extends TypedEventEmitter<AppEvents> {
  public constructor(emitter: EventEmitter2) {
    super(emitter);
  }
}
