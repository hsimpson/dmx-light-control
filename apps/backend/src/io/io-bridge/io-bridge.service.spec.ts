/// <reference types="vitest/globals" />
import { IoBridgeService } from './io-bridge.service';
import { AppEventEmitter } from '@/events/app-event-emitter';
import { vi } from 'vitest';

describe('IoBridgeService', () => {
  function build() {
    const eventEmitter = { emit: vi.fn(), on: vi.fn() } as unknown as AppEventEmitter;
    const service = new IoBridgeService(eventEmitter);
    return { service, eventEmitter };
  }

  it('registers midi.inputMessage and midi.outputOpened listeners on init', () => {
    const { service, eventEmitter } = build();
    service.onModuleInit();
    expect((eventEmitter as any).on).toHaveBeenCalledWith('midi.inputMessage', expect.any(Function));
    expect((eventEmitter as any).on).toHaveBeenCalledWith('midi.outputOpened', expect.any(Function));
  });

  it('emits led messages on midi.outputOpened', () => {
    const { service, eventEmitter } = build();
    service.onModuleInit();
    const outOpenedListener = (eventEmitter as any).on.mock.calls.find((c: any[]) => c[0] === 'midi.outputOpened')[1];
    outOpenedListener();
    expect((eventEmitter as any).emit).toHaveBeenCalledWith('midi.sendMessage', expect.any(Array));
  });

  it('ignores unmapped midi notes', () => {
    const { service, eventEmitter } = build();
    service.onModuleInit();
    const listener = (eventEmitter as any).on.mock.calls.find((c: any[]) => c[0] === 'midi.inputMessage')[1];
    const warnSpy = vi.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
    listener([144, 99, 100]); // note 99 not in mapping
    expect(warnSpy).toHaveBeenCalled();
    expect((eventEmitter as any).emit).not.toHaveBeenCalledWith('dmx.channelValues', expect.anything());
    warnSpy.mockRestore();
  });

  it('maps Note On to dmx channel values', () => {
    const { service, eventEmitter } = build();
    service.onModuleInit();
    const listener = (eventEmitter as any).on.mock.calls.find((c: any[]) => c[0] === 'midi.inputMessage')[1];
    listener([144, 0, 127]); // note 0 -> channel 1, value 127 -> 255
    expect((eventEmitter as any).emit).toHaveBeenCalledWith('dmx.channelValues', [{ channel: 1, value: 255 }]);
  });

  it('maps Note Off to zero', () => {
    const { service, eventEmitter } = build();
    service.onModuleInit();
    const listener = (eventEmitter as any).on.mock.calls.find((c: any[]) => c[0] === 'midi.inputMessage')[1];
    listener([128, 1, 100]); // note 1 -> channel 2
    expect((eventEmitter as any).emit).toHaveBeenCalledWith('dmx.channelValues', [{ channel: 2, value: 0 }]);
  });

  it('maps Poly Key Pressure and Control Change', () => {
    const { service, eventEmitter } = build();
    service.onModuleInit();
    const listener = (eventEmitter as any).on.mock.calls.find((c: any[]) => c[0] === 'midi.inputMessage')[1];
    listener([160, 2, 64]); // note 2 -> channel 3, value 64 -> round((64/127)*255)=129
    listener([176, 3, 64]); // note 3 -> channel 4, value 64 -> 129
    expect((eventEmitter as any).emit).toHaveBeenCalledWith('dmx.channelValues', [{ channel: 3, value: 129 }]);
    expect((eventEmitter as any).emit).toHaveBeenCalledWith('dmx.channelValues', [{ channel: 4, value: 129 }]);
  });

  it('maps fader notes to multiple channels', () => {
    const { service, eventEmitter } = build();
    service.onModuleInit();
    const listener = (eventEmitter as any).on.mock.calls.find((c: any[]) => c[0] === 'midi.inputMessage')[1];
    listener([144, 48, 127]); // note 48 -> channels [1,10]
    expect((eventEmitter as any).emit).toHaveBeenCalledWith('dmx.channelValues', [{ channel: 1, value: 255 }]);
    expect((eventEmitter as any).emit).toHaveBeenCalledWith('dmx.channelValues', [{ channel: 10, value: 255 }]);
  });

  it('handles status bytes outside the handled ranges as zero value', () => {
    const { service, eventEmitter } = build();
    service.onModuleInit();
    const listener = (eventEmitter as any).on.mock.calls.find((c: any[]) => c[0] === 'midi.inputMessage')[1];
    listener([192, 0, 0]); // Program Change: note 0 -> channel 1, status outside ranges -> dmxValue 0
    expect((eventEmitter as any).emit).toHaveBeenCalledWith('dmx.channelValues', [{ channel: 1, value: 0 }]);
  });
});
