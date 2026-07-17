/// <reference types="vitest/globals" />
import 'reflect-metadata';
import { EventsModule } from './events.module';
import { AppEventEmitter } from './app-event-emitter';

describe('EventsModule', () => {
  it('is an NgModule providing and exporting AppEventEmitter', () => {
    expect(EventsModule.name).toBe('EventsModule');
    const meta = {
      providers: Reflect.getMetadata('providers', EventsModule) as unknown[],
      exports: Reflect.getMetadata('exports', EventsModule) as unknown[],
    };
    expect(meta).toBeDefined();
    expect(meta.providers).toContain(AppEventEmitter);
    expect(meta.exports).toContain(AppEventEmitter);
  });
});
