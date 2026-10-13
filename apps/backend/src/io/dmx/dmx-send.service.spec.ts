import { AppEventEmitter } from '@/events/app-event-emitter';
import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DmxSendService } from './dmx-send.service';
import { DmxUniverseService } from './dmx-universe.service';

function build() {
  const eventEmitterMock = {
    emit: vi.fn<(event: string, payload?: unknown) => boolean>(),
    on: vi.fn<(event: string, listener: (...args: unknown[]) => void) => void>(),
  };
  const universe = new DmxUniverseService();
  const service = new DmxSendService(eventEmitterMock as unknown as AppEventEmitter, universe);
  return { service, eventEmitterMock, universe };
}

describe('DmxSendService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers a dmx.manualValues listener on init', () => {
    const { service, eventEmitterMock } = build();
    service.onModuleInit();
    expect(eventEmitterMock.on).toHaveBeenCalledWith('dmx.manualValues', expect.any(Function));
  });

  it('applies manual values to the universe and republishes the applied deltas', () => {
    const { service, eventEmitterMock, universe } = build();
    service.onModuleInit();
    const listener = eventEmitterMock.on.mock.calls[0]?.[1];
    listener?.([{ channel: 5, value: 128 }]);
    expect(universe.getFrame()[5]).toBe(128);
    expect(eventEmitterMock.emit).toHaveBeenCalledWith('dmx.channelValues', [{ channel: 5, value: 128 }]);
  });

  it('setChannelValues ignores out-of-range channel and value', () => {
    const { service, eventEmitterMock, universe } = build();
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    service.onModuleInit();
    const listener = eventEmitterMock.on.mock.calls[0]?.[1];
    listener?.([
      { channel: 0, value: 10 },
      { channel: 513, value: 10 },
      { channel: 1, value: -1 },
      { channel: 1, value: 256 },
      { channel: 5, value: 128 },
    ]);
    expect(warn).toHaveBeenCalledTimes(4);
    expect(universe.getFrame()[5]).toBe(128);
  });
});
