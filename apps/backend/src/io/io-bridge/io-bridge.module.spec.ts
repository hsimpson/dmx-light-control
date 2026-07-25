import { describe, it, expect } from 'vitest';
import { EventsModule } from '@/events/events.module';
import 'reflect-metadata';
import { IoBridgeModule } from './io-bridge.module';
import { IoBridgeService } from './io-bridge.service';

describe('IoBridgeModule', () => {
  it('is defined as an NgModule', () => {
    expect(IoBridgeModule.name).toBe('IoBridgeModule');
  });

  it('imports EventsModule and provides IoBridgeService', () => {
    const imports = Reflect.getMetadata('imports', IoBridgeModule) as unknown[];
    const providers = Reflect.getMetadata('providers', IoBridgeModule) as unknown[];
    expect(imports).toContain(EventsModule);
    expect(providers).toContain(IoBridgeService);
  });
});
