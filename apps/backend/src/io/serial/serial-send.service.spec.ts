import { AppEventEmitter } from '@/events/app-event-emitter';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { DmxValue } from '../dmx/types/dmx.types';
import { SerialSendService } from './serial-send.service';

const { fakePort } = vi.hoisted(() => ({
  fakePort: {
    isOpen: false,
    open: vi.fn((cb: (err?: Error) => void) => {
      cb(undefined);
    }),
    close: vi.fn((cb: (err?: Error) => void) => {
      cb(undefined);
    }),
    on: vi.fn(),
    set: vi.fn((_opts: unknown, cb: (err?: Error) => void) => {
      cb(undefined);
    }),
    write: vi.fn((_buf: unknown, cb: (err?: Error) => void) => {
      cb(undefined);
    }),
  },
}));

vi.mock('serialport', () => ({
  SerialPort: class {
    public isOpen = false;
    public open = fakePort.open;
    public close = fakePort.close;
    public on = fakePort.on;
    public set = fakePort.set;
    public write = fakePort.write;
    public constructor() {
      this.isOpen = true;
    }
  },
}));

interface EventEmitterHarness extends AppEventEmitter {
  emit: Mock;
  on: Mock;
}

interface SerialSendServiceHarness {
  onModuleInit: () => void;
  onModuleDestroy: () => void;
  port: { isOpen: boolean };
  dmxFrame: Uint8Array;
  isSending: boolean;
  logger: { error: Mock; warn: Mock; log: Mock; debug: Mock };
  startSendingLoop: () => void;
  stopSendingLoop: () => void;
  sendDmxFrame: () => void;
  closePort: () => void;
}

describe('SerialSendService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(global, 'setInterval').mockReturnValue(1 as unknown as NodeJS.Timeout);
    vi.spyOn(global, 'clearInterval').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  function build() {
    const eventEmitter = { emit: vi.fn(), on: vi.fn() } as unknown as EventEmitterHarness;
    const service = new SerialSendService(eventEmitter) as unknown as SerialSendServiceHarness;
    return { service, eventEmitter };
  }

  it('initializes port and registers dmx.channelValues listener on init', () => {
    const { service, eventEmitter } = build();
    service.onModuleInit();
    expect(eventEmitter.on).toHaveBeenCalledWith('dmx.channelValues', expect.any(Function));
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
    service.startSendingLoop();
    expect(global.setInterval).toHaveBeenCalled();
  });

  it('startSendingLoop is idempotent', () => {
    const { service } = build();
    service.onModuleInit();
    service.startSendingLoop();
    service.startSendingLoop();
    expect(global.setInterval).toHaveBeenCalledTimes(1);
  });

  it('stopSendingLoop clears interval', () => {
    const { service } = build();
    service.onModuleInit();
    service.startSendingLoop();
    service.stopSendingLoop();
    expect(global.clearInterval).toHaveBeenCalled();
  });

  it('setChannelValues ignores invalid channel/value and applies valid ones', () => {
    const { service, eventEmitter } = build();
    service.onModuleInit();
    const listener = eventEmitter.on.mock.calls[0]?.[1] as (values: DmxValue[]) => void;
    listener([
      { channel: 0, value: 1 },
      { channel: 513, value: 1 },
      { channel: 1, value: -1 },
      { channel: 1, value: 256 },
      { channel: 3, value: 200 },
    ]);
    // valid channel 3 → frame buffer index 3 set to 200
    expect(service.dmxFrame[3]).toBe(200);
    // invalid entries were skipped without throwing; because port.isOpen is true in the mock,
    // the listener also calls startSendingLoop → setInterval is invoked
    expect(global.setInterval).toHaveBeenCalled();
  });

  it('sendDmxFrame returns early when port not open', () => {
    const { service } = build();
    service.onModuleInit();
    service.port.isOpen = false;
    expect(() => {
      service.sendDmxFrame();
    }).not.toThrow();
  });

  it('sendDmxFrame performs break/mab/write when open', () => {
    const { service } = build();
    service.onModuleInit();
    service.port.isOpen = true;
    service.sendDmxFrame();
    expect(fakePort.set).toHaveBeenCalled();
    expect(fakePort.write).toHaveBeenCalled();
  });

  it('closePort handles closed port gracefully', () => {
    const { service } = build();
    service.onModuleInit();
    service.port.isOpen = false;
    expect(() => {
      service.closePort();
    }).not.toThrow();
  });

  it('logs and warns when port fails to open', () => {
    const { service } = build();
    fakePort.open.mockImplementationOnce((cb: (err?: Error) => void) => {
      cb(new Error('boom'));
    });
    const errorSpy = vi.spyOn(service.logger, 'error').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(service.logger, 'warn').mockImplementation(() => undefined);
    service.onModuleInit();
    expect(errorSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('handles serial port errors by stopping the loop', () => {
    const { service } = build();
    service.onModuleInit();
    const errorCallback = fakePort.on.mock.calls.find((c: unknown[]) => c[0] === 'error')?.[1] as
      ((err: Error) => void) | undefined;
    expect(typeof errorCallback).toBe('function');
    const stopSpy = vi.spyOn(service, 'stopSendingLoop').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(service.logger, 'error').mockImplementation(() => undefined);
    errorCallback?.(new Error('port failure'));
    expect(errorSpy).toHaveBeenCalled();
    expect(stopSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
    stopSpy.mockRestore();
  });

  it('logs an error when the frame write fails', () => {
    const { service } = build();
    service.onModuleInit();
    service.port.isOpen = true;
    fakePort.write.mockImplementationOnce((_buf: unknown, cb: (err?: Error) => void) => {
      cb(new Error('write boom'));
    });
    const errorSpy = vi.spyOn(service.logger, 'error').mockImplementation(() => undefined);
    service.sendDmxFrame();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('does not start the loop from the listener when the port is closed', () => {
    const { service, eventEmitter } = build();
    service.onModuleInit();
    service.port.isOpen = false;
    const listener = eventEmitter.on.mock.calls[0]?.[1] as (values: DmxValue[]) => void;
    listener([{ channel: 3, value: 200 }]);
    expect(global.setInterval).not.toHaveBeenCalled();
  });

  it('interval callback is a no-op when the port is closed or not sending', () => {
    const { service } = build();
    service.onModuleInit();
    service.startSendingLoop();
    const callback = (global.setInterval as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as () => void;
    service.port.isOpen = false;
    service.isSending = true;
    callback();
    service.port.isOpen = true;
    service.isSending = false;
    callback();
    expect(fakePort.set).not.toHaveBeenCalled();
  });

  it('sendDmxFrame returns early when the break set reports an error', () => {
    const { service } = build();
    service.onModuleInit();
    service.port.isOpen = true;
    fakePort.set.mockImplementationOnce((_opts: unknown, cb: (err?: Error) => void) => {
      cb(new Error('brk boom'));
    });
    expect(() => {
      service.sendDmxFrame();
    }).not.toThrow();
    expect(fakePort.write).not.toHaveBeenCalled();
  });

  it('sendDmxFrame returns early when the unbreak set reports an error', () => {
    const { service } = build();
    service.onModuleInit();
    service.port.isOpen = true;
    let call = 0;
    fakePort.set.mockImplementation((_opts: unknown, cb: (err?: Error) => void) => {
      call += 1;
      cb(call === 1 ? undefined : new Error('unbrk boom'));
    });
    expect(() => {
      service.sendDmxFrame();
    }).not.toThrow();
    expect(fakePort.write).not.toHaveBeenCalled();
  });

  it('closePort logs an error when closing fails', () => {
    const { service } = build();
    service.onModuleInit();
    service.port.isOpen = true;
    fakePort.close.mockImplementationOnce((cb: (err?: Error) => void) => {
      cb(new Error('close boom'));
    });
    const errorSpy = vi.spyOn(service.logger, 'error').mockImplementation(() => undefined);
    service.closePort();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
