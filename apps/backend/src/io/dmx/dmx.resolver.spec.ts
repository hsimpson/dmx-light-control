import { AppEventEmitter } from '@/events/app-event-emitter';
import { describe, expect, it, vi } from 'vitest';
import { DmxResolver } from './dmx.resolver';
import { ChannelValuesInput } from './dto/dmx-set-channel-values.dto';

describe('DmxResolver', () => {
  it('emits dmx.channelValues and returns success string', () => {
    const eventEmitterMock = {
      emit: vi.fn<(event: string, payload?: unknown) => boolean>(),
    };
    const eventEmitter = eventEmitterMock as unknown as AppEventEmitter;
    const resolver = new DmxResolver(eventEmitter);
    const dto: ChannelValuesInput = { dmxValues: [{ channel: 1, value: 100 }] };
    const result = resolver.setChannelValues(dto);
    expect(eventEmitterMock.emit).toHaveBeenCalledWith('dmx.channelValues', dto.dmxValues);
    expect(result).toBe('DMX channel values set successfully');
  });
});
