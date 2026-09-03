import { describe, it, expect } from 'vitest';
import { EventEmitter2 } from 'eventemitter2';
import { AppEventEmitter } from './app-event-emitter';

describe('AppEventEmitter', () => {
  it('constructs from an EventEmitter2 instance', () => {
    const emitter = new EventEmitter2();
    const appEmitter = new AppEventEmitter(emitter);
    expect(appEmitter).toBeInstanceOf(AppEventEmitter);
  });
});
