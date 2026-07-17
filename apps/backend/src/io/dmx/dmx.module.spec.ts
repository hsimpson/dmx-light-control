/// <reference types="vitest/globals" />
import 'reflect-metadata';
import { DmxModule } from './dmx.module';
import { DmxSnifferCommand } from './dmx-sniffer.command';
import { DmxSnifferService } from './dmx-sniffer.service';
import { DmxResolver } from './dmx.resolver';
import { SerialSendService } from '../serial/serial-send.service';

describe('DmxModule', () => {
  it('is an NgModule providing the dmx domain classes', () => {
    expect(DmxModule.name).toBe('DmxModule');
    const providers = Reflect.getMetadata('providers', DmxModule) as unknown[];
    const exports = Reflect.getMetadata('exports', DmxModule) as unknown[];
    expect(providers).toBeDefined();
    expect(providers).toContain(DmxSnifferCommand);
    expect(providers).toContain(DmxSnifferService);
    expect(providers).toContain(DmxResolver);
    expect(providers).toContain(SerialSendService);
    expect(exports).toContain(DmxSnifferCommand);
  });
});
