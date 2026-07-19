import { Logger } from '@nestjs/common';
import { describe, it, expect, vi } from 'vitest';
import { AppEventEmitter } from '@/events/app-event-emitter';
import { IoBridgeService } from './io-bridge.service';

describe('IoBridgeService', () => {
  function build() {
    const eventEmitterMock = {
      emit: vi.fn<(event: string, payload?: unknown) => boolean>(),
      on: vi.fn<(event: string, listener: (...args: unknown[]) => void) => void>(),
    };
    const eventEmitter = eventEmitterMock as unknown as AppEventEmitter;
    const service = new IoBridgeService(eventEmitter);
    return { service, eventEmitter, eventEmitterMock };
  }

  it('registers midi.inputMessage and midi.outputOpened listeners on init', () => {
    const { service, eventEmitter } = build();
    service.onModuleInit();
    expect(eventEmitter.on).toHaveBeenCalledWith('midi.inputMessage', expect.any(Function));
    expect(eventEmitter.on).toHaveBeenCalledWith('midi.outputOpened', expect.any(Function));
  });

  it('emits led messages on midi.outputOpened', () => {
    const { service, eventEmitter, eventEmitterMock } = build();
    service.onModuleInit();
    const outOpenedListener = eventEmitterMock.on.mock.calls.find(c => c[0] === 'midi.outputOpened')?.[1];
    outOpenedListener?.();
    expect(eventEmitter.emit).toHaveBeenCalledWith('midi.sendMessage', expect.any(Array));
  });

  it('ignores unmapped midi notes', () => {
    const { service, eventEmitter, eventEmitterMock } = build();
    service.onModuleInit();
    const listener = eventEmitterMock.on.mock.calls.find(c => c[0] === 'midi.inputMessage')?.[1];
    const warnSpy = vi
      .spyOn((service as unknown as { logger: Logger }).logger, 'warn')
      .mockImplementation(() => undefined);
    listener?.([144, 99, 100]); // note 99 not in mapping
    expect(warnSpy).toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalledWith('dmx.channelValues', expect.anything());
    warnSpy.mockRestore();
  });

  it('maps Note On to dmx channel values', () => {
    const { service, eventEmitter, eventEmitterMock } = build();
    service.onModuleInit();
    const listener = eventEmitterMock.on.mock.calls.find(c => c[0] === 'midi.inputMessage')?.[1];
    listener?.([144, 0, 127]); // note 0 -> channel 1, value 127 -> 255
    expect(eventEmitter.emit).toHaveBeenCalledWith('dmx.channelValues', [{ channel: 1, value: 255 }]);
  });

  it('maps Note Off to zero', () => {
    const { service, eventEmitter, eventEmitterMock } = build();
    service.onModuleInit();
    const listener = eventEmitterMock.on.mock.calls.find(c => c[0] === 'midi.inputMessage')?.[1];
    listener?.([128, 1, 100]); // note 1 -> channel 2
    expect(eventEmitter.emit).toHaveBeenCalledWith('dmx.channelValues', [{ channel: 2, value: 0 }]);
  });

  it('maps Poly Key Pressure and Control Change', () => {
    const { service, eventEmitter, eventEmitterMock } = build();
    service.onModuleInit();
    const listener = eventEmitterMock.on.mock.calls.find(c => c[0] === 'midi.inputMessage')?.[1];
    listener?.([160, 2, 64]); // note 2 -> channel 3, value 64 -> round((64/127)*255)=129
    listener?.([176, 3, 64]); // note 3 -> channel 4, value 64 -> 129
    expect(eventEmitter.emit).toHaveBeenCalledWith('dmx.channelValues', [{ channel: 3, value: 129 }]);
    expect(eventEmitter.emit).toHaveBeenCalledWith('dmx.channelValues', [{ channel: 4, value: 129 }]);
  });

  it('maps fader notes to multiple channels', () => {
    const { service, eventEmitter, eventEmitterMock } = build();
    service.onModuleInit();
    const listener = eventEmitterMock.on.mock.calls.find(c => c[0] === 'midi.inputMessage')?.[1];
    listener?.([144, 48, 127]); // note 48 -> channels [1,10]
    expect(eventEmitter.emit).toHaveBeenCalledWith('dmx.channelValues', [{ channel: 1, value: 255 }]);
    expect(eventEmitter.emit).toHaveBeenCalledWith('dmx.channelValues', [{ channel: 10, value: 255 }]);
  });

  it('handles status bytes outside the handled ranges as zero value', () => {
    const { service, eventEmitter, eventEmitterMock } = build();
    service.onModuleInit();
    const listener = eventEmitterMock.on.mock.calls.find(c => c[0] === 'midi.inputMessage')?.[1];
    listener?.([192, 0, 0]); // Program Change: note 0 -> channel 1, status outside ranges -> dmxValue 0
    expect(eventEmitter.emit).toHaveBeenCalledWith('dmx.channelValues', [{ channel: 1, value: 0 }]);
  });
});
