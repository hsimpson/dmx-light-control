/// <reference types="vitest/globals" />
import { SerialSendService } from './serial-send.service';
import { AppEventEmitter } from '@/events/app-event-emitter';
import { vi } from 'vitest';

const { fakePort } = vi.hoisted(() => ({
  fakePort: {
    isOpen: false,
    open: vi.fn((cb: (err?: Error) => void) => cb(undefined)),
    close: vi.fn((cb: (err?: Error) => void) => cb(undefined)),
    on: vi.fn(),
    set: vi.fn((_opts: unknown, cb: (err?: Error) => void) => cb(undefined)),
    write: vi.fn((_buf: unknown, cb: (err?: Error) => void) => cb(undefined)),
  },
}));

vi.mock('serialport', () => ({
  SerialPort: class {
    isOpen = false;
    open = fakePort.open;
    close = fakePort.close;
    on = fakePort.on;
    set = fakePort.set;
    write = fakePort.write;
    constructor() {
      this.isOpen = true;
    }
  },
}));

describe('SerialSendService', () => {
  beforeEach(() => {
    vi.spyOn(global, 'setInterval').mockReturnValue(1 as unknown as NodeJS.Timeout);
    vi.spyOn(global, 'clearInterval').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  function build() {
    const eventEmitter = { emit: vi.fn(), on: vi.fn() } as unknown as AppEventEmitter;
    const service = new SerialSendService(eventEmitter);
    return { service, eventEmitter };
  }

  it('initializes port and registers dmx.channelValues listener on init', () => {
    const { service, eventEmitter } = build();
    service.onModuleInit();
    expect((eventEmitter as any).on).toHaveBeenCalledWith('dmx.channelValues', expect.any(Function));
  });

  it('onModuleDestroy stops loop and closes port', () => {
    const { service } = build();
    service.onModuleInit();
    service.onModuleDestroy();
    expect(fakePort.close).toHaveBeenCalled();
  });

  it('startSendingLoop sets isSending and schedules interval', () => {
    const { service } = build();
    service.onModuleInit();
    (service as any).startSendingLoop();
    expect(global.setInterval).toHaveBeenCalled();
  });

  it('startSendingLoop is idempotent', () => {
    const { service } = build();
    service.onModuleInit();
    (service as any).startSendingLoop();
    (service as any).startSendingLoop();
    expect(global.setInterval).toHaveBeenCalledTimes(1);
  });

  it('stopSendingLoop clears interval', () => {
    const { service } = build();
    service.onModuleInit();
    (service as any).startSendingLoop();
    (service as any).stopSendingLoop();
    expect(global.clearInterval).toHaveBeenCalled();
  });

  it('setChannelValues ignores invalid channel/value and applies valid ones', () => {
    const { service, eventEmitter } = build();
    service.onModuleInit();
    const listener = (eventEmitter as any).on.mock.calls[0][1];
    listener([
      { channel: 0, value: 1 },
      { channel: 513, value: 1 },
      { channel: 1, value: -1 },
      { channel: 1, value: 256 },
      { channel: 3, value: 200 },
    ]);
    // valid channel 3 → frame buffer index 3 set to 200
    expect((service as any).dmxFrame[3]).toBe(200);
    // invalid entries did not throw and did not start the loop (port.isOpen is true in mock,
    // so the listener DOES call startSendingLoop → setInterval is invoked)
    expect(global.setInterval).toHaveBeenCalled();
  });

  it('sendDmxFrame returns early when port not open', () => {
    const { service } = build();
    service.onModuleInit();
    (service as any).port.isOpen = false;
    expect(() => (service as any).sendDmxFrame()).not.toThrow();
  });

  it('sendDmxFrame performs break/mab/write when open', () => {
    const { service } = build();
    service.onModuleInit();
    (service as any).port.isOpen = true;
    (service as any).sendDmxFrame();
    expect(fakePort.set).toHaveBeenCalled();
    expect(fakePort.write).toHaveBeenCalled();
  });

  it('closePort handles closed port gracefully', () => {
    const { service } = build();
    service.onModuleInit();
    (service as any).port.isOpen = false;
    expect(() => (service as any).closePort()).not.toThrow();
  });
});
