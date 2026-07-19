import { describe, it, expect } from 'vitest';
import { EventsModule } from '@/events/events.module';
import 'reflect-metadata';
import { MidiModule } from './midi.module';
import { MidiResolver } from './midi.resolver';
import { MidiService } from './midi.service';

describe('MidiModule', () => {
  it('is defined as an NgModule with correct metadata', () => {
    expect(MidiModule.name).toBe('MidiModule');
    const providers = Reflect.getMetadata('providers', MidiModule) as unknown[];
    expect(providers).toContain(MidiService);
    expect(providers).toContain(MidiResolver);
    const imports = Reflect.getMetadata('imports', MidiModule) as unknown[];
    expect(imports).toContain(EventsModule);
    expect(Reflect.getMetadata('exports', MidiModule)).toBeUndefined();
  });
});
