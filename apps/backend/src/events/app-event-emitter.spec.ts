/// <reference types="vitest/globals" />
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppEventEmitter } from './app-event-emitter';

describe('AppEventEmitter', () => {
  it('constructs from an EventEmitter2 instance', () => {
    const emitter = new EventEmitter2();
    const appEmitter = new AppEventEmitter(emitter);
    expect(appEmitter).toBeInstanceOf(AppEventEmitter);
  });
});
