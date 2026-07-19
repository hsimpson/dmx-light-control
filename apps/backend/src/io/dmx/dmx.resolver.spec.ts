import { describe, it, expect, vi } from 'vitest';
import { AppEventEmitter } from '@/events/app-event-emitter';
import { DmxResolver } from './dmx.resolver';

describe('DmxResolver', () => {
  it('emits dmx.channelValues and returns success string', () => {
    const eventEmitter = { emit: vi.fn() } as unknown as AppEventEmitter;
    const resolver = new DmxResolver(eventEmitter);
    const dto = { dmxValues: [{ channel: 1, value: 100 }] } as any;
    const result = resolver.setChannelValues(dto);
    expect(eventEmitter.emit).toHaveBeenCalledWith('dmx.channelValues', dto.dmxValues);
    expect(result).toBe('DMX channel values set successfully');
  });
});
