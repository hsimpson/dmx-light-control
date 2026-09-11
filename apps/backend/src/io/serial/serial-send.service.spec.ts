import { AppEventEmitter } from '@/events/app-event-emitter';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { DmxValue } from '../dmx/types/dmx.types';
import { SerialSendService } from './serial-send.service';

const { fakePort, listMock, serialPortCtor } = vi.hoisted(() => ({
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
  listMock: vi.fn(),
  serialPortCtor: vi.fn(),
}));

vi.mock('serialport', () => ({
  SerialPort: class {
    public static list = listMock;
    public isOpen = false;
    public open = fakePort.open;
    public close = fakePort.close;
    public on = fakePort.on;
    public set = fakePort.set;
    public write = fakePort.write;
    public constructor(opts: { path: string }) {
      serialPortCtor(opts);
      this.isOpen = true;
    }
  },
}));

interface EventEmitterHarness extends AppEventEmitter {
  emit: Mock;
  on: Mock;
}

interface SerialSendServiceHarness {
  onModuleInit: () => Promise<void>;
  onModuleDestroy: () => void;
  port: { isOpen: boolean; set: Mock };
  dmxFrame: Uint8Array;
  isSending: boolean;
  logger: { error: Mock; warn: Mock; log: Mock; debug: Mock };
  startSendingLoop: () => void;
  stopSendingLoop: () => void;
  sendDmxFrame: () => void;
  flushFrame: (err1: Error | null) => void;
  setChannelValues: (values: DmxValue[]) => void;
  closePort: () => void;
}

describe('SerialSendService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listMock.mockResolvedValue([{ path: '/dev/cu.usbserial-TEST', vendorId: '0403', productId: '6001' }]);
    vi.useFakeTimers();
    vi.spyOn(global, 'setInterval').mockReturnValue(1 as unknown as NodeJS.Timeout);
    vi.spyOn(global, 'clearInterval').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function build(serialPath?: string) {
    const eventEmitter = { emit: vi.fn(), on: vi.fn() } as unknown as EventEmitterHarness;
    const configService = { get: vi.fn(() => serialPath) };
    const service = new SerialSendService(eventEmitter, configService as never) as unknown as SerialSendServiceHarness;
    return { service, eventEmitter };
  }

  it('initializes port and registers dmx.channelValues listener on init', async () => {
    const { service, eventEmitter } = build();
    await service.onModuleInit();
    expect(eventEmitter.on).toHaveBeenCalledWith('dmx.channelValues', expect.any(Function));
  });

  it('onModuleDestroy stops loop and closes port', async () => {
    const { service } = build();
    await service.onModuleInit();
    service.onModuleDestroy();
    expect(fakePort.close).toHaveBeenCalled();
  });

  it('startSendingLoop sets isSending and schedules interval', async () => {
    const { service } = build();
    await service.onModuleInit();
    service.startSendingLoop();
    expect(global.setInterval).toHaveBeenCalled();
  });

  it('startSendingLoop is idempotent', async () => {
    const { service } = build();
    await service.onModuleInit();
    service.startSendingLoop();
    service.startSendingLoop();
    expect(global.setInterval).toHaveBeenCalledTimes(1);
  });

  it('stopSendingLoop clears interval', async () => {
    const { service } = build();
    await service.onModuleInit();
    service.startSendingLoop();
    service.stopSendingLoop();
    expect(global.clearInterval).toHaveBeenCalled();
  });

  it('setChannelValues ignores invalid channel/value and applies valid ones', async () => {
    const { service, eventEmitter } = build();
    await service.onModuleInit();
    const listener = eventEmitter.on.mock.calls[0]?.[1] as (values: DmxValue[]) => void;
    const warnSpy = vi.spyOn(service.logger, 'warn').mockImplementation(() => undefined);
    listener([
      { channel: 0, value: 1 },
      { channel: 513, value: 1 },
      { channel: 1, value: -1 },
      { channel: 1, value: 256 },
      { channel: 3, value: 200 },
    ]);
    // valid channel 3 → frame buffer index 3 set to 200
    expect(service.dmxFrame[3]).toBe(200);
    // invalid channel entries (0, 513) trigger a warning each
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid DMX channel'));
    // invalid value entries (channel 1 with -1 and 256) trigger a warning each
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid DMX value'));
    // because port.isOpen is true in the mock, the listener also calls startSendingLoop → setInterval is invoked
    expect(global.setInterval).toHaveBeenCalled();
  });

  it('setChannelValues warns and skips out-of-range channels directly', () => {
    const { service } = build();
    const warnSpy = vi.spyOn(service.logger, 'warn').mockImplementation(() => undefined);
    service.setChannelValues([
      { channel: 0, value: 100 },
      { channel: 513, value: 100 },
    ]);
    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(service.dmxFrame[0]).toBe(0);
  });

  it('sendDmxFrame returns early when port not open', async () => {
    const { service } = build();
    await service.onModuleInit();
    service.port.isOpen = false;
    expect(() => {
      service.sendDmxFrame();
    }).not.toThrow();
  });

  it('interval callback skips sending when the loop was stopped', async () => {
    const { service } = build();
    await service.onModuleInit();
    service.port.isOpen = true;
    service.startSendingLoop();
    // capture the interval callback registered via setInterval
    const callback = (global.setInterval as unknown as Mock).mock.calls[0]?.[0] as () => void;
    // stop the loop so isSending becomes false, then fire the callback
    service.stopSendingLoop();
    const writeSpy = vi.spyOn(fakePort, 'write').mockImplementation(() => undefined);
    callback();
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it('interval callback sends a frame while the loop is running', async () => {
    const { service } = build();
    await service.onModuleInit();
    service.port.isOpen = true;
    service.startSendingLoop();
    const callback = (global.setInterval as unknown as Mock).mock.calls[0]?.[0] as () => void;
    const setSpy = vi.spyOn(fakePort, 'set').mockImplementation((_o: unknown, cb: (e?: Error) => void) => {
      cb(undefined);
    });
    const writeSpy = vi.spyOn(fakePort, 'write').mockImplementation(() => {
      return;
    });
    callback();
    vi.advanceTimersByTime(1);
    expect(setSpy).toHaveBeenCalled();
    expect(writeSpy).toHaveBeenCalled();
  });

  it('holds the serial BREAK before writing the frame', async () => {
    const { service } = build();
    await service.onModuleInit();
    service.port.isOpen = true;
    service.sendDmxFrame();
    expect(fakePort.set).toHaveBeenCalledWith({ brk: true }, expect.any(Function));
    expect(fakePort.write).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fakePort.write).toHaveBeenCalled();
  });

  it('sendDmxFrame performs break/mab/write when open', async () => {
    const { service } = build();
    await service.onModuleInit();
    service.port.isOpen = true;
    service.sendDmxFrame();
    vi.advanceTimersByTime(1);
    expect(fakePort.set).toHaveBeenCalled();
    expect(fakePort.write).toHaveBeenCalled();
  });

  it('sendDmxFrame returns early when the break-release set() fails', async () => {
    const { service } = build();
    await service.onModuleInit();
    service.port.isOpen = true;
    // First set() (break) succeeds, second set() (break release) fails →
    // exercises the `if (err1) return;` early-exit branch.
    let setCall = 0;
    const originalSet = service.port.set;
    service.port.set = vi.fn((_o: unknown, cb: (e?: Error) => void) => {
      setCall += 1;
      cb(setCall >= 2 ? new Error('brk release failed') : undefined);
    });
    const writeSpy = vi.spyOn(fakePort, 'write').mockImplementation(() => undefined);
    expect(() => {
      service.sendDmxFrame();
    }).not.toThrow();
    vi.advanceTimersByTime(1);
    expect(writeSpy).not.toHaveBeenCalled();
    service.port.set = originalSet;
    writeSpy.mockRestore();
  });

  it('closePort handles closed port gracefully', async () => {
    const { service } = build();
    await service.onModuleInit();
    service.port.isOpen = false;
    expect(() => {
      service.closePort();
    }).not.toThrow();
  });

  it('logs and warns when port fails to open', async () => {
    const { service } = build();
    fakePort.open.mockImplementationOnce((cb: (err?: Error) => void) => {
      cb(new Error('boom'));
    });
    const errorSpy = vi.spyOn(service.logger, 'error').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(service.logger, 'warn').mockImplementation(() => undefined);
    await service.onModuleInit();
    expect(errorSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('handles serial port errors by stopping the loop', async () => {
    const { service } = build();
    await service.onModuleInit();
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

  it('flushFrame logs and skips write when break release failed', () => {
    const { service } = build();
    const errorSpy = vi.spyOn(service.logger, 'error').mockImplementation(() => undefined);
    service.flushFrame(new Error('brk release failed'));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Error releasing BREAK state'));
    expect(fakePort.write).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('flushFrame writes the dmx buffer when break release succeeds', async () => {
    const { service } = build();
    await service.onModuleInit();
    service.port.isOpen = true;
    fakePort.write.mockImplementationOnce((_buf: unknown, cb: (err?: Error) => void) => {
      cb(undefined);
    });
    service.flushFrame(null);
    expect(fakePort.write).toHaveBeenCalled();
  });

  it('flushFrame logs when payload write fails', async () => {
    const { service } = build();
    await service.onModuleInit();
    fakePort.write.mockImplementationOnce((_buf: unknown, cb: (err?: Error) => void) => {
      cb(new Error('write boom'));
    });
    const errorSpy = vi.spyOn(service.logger, 'error').mockImplementation(() => undefined);
    service.flushFrame(null);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Error flushing payload'));
    errorSpy.mockRestore();
  });

  it('does not start the loop from the listener when the port is closed', async () => {
    const { service, eventEmitter } = build();
    await service.onModuleInit();
    (global.setInterval as unknown as Mock).mockClear();
    service.port.isOpen = false;
    const listener = eventEmitter.on.mock.calls[0]?.[1] as (values: DmxValue[]) => void;
    listener([{ channel: 3, value: 200 }]);
    expect(global.setInterval).not.toHaveBeenCalled();
  });

  it('interval callback is a no-op when the port is closed or not sending', async () => {
    const { service } = build();
    await service.onModuleInit();
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

  it('sendDmxFrame returns early when the break set reports an error', async () => {
    const { service } = build();
    await service.onModuleInit();
    service.port.isOpen = true;
    fakePort.set.mockImplementationOnce((_opts: unknown, cb: (err?: Error) => void) => {
      cb(new Error('brk boom'));
    });
    expect(() => {
      service.sendDmxFrame();
    }).not.toThrow();
    expect(fakePort.write).not.toHaveBeenCalled();
  });

  it('sendDmxFrame returns early when the unbreak set reports an error', async () => {
    const { service } = build();
    await service.onModuleInit();
    service.port.isOpen = true;
    let call = 0;
    fakePort.set.mockImplementation((_opts: unknown, cb: (err?: Error) => void) => {
      call += 1;
      cb(call === 1 ? undefined : new Error('unbrk boom'));
    });
    expect(() => {
      service.sendDmxFrame();
    }).not.toThrow();
    vi.advanceTimersByTime(1);
    expect(fakePort.write).not.toHaveBeenCalled();
  });

  it('closePort logs an error when closing fails', async () => {
    const { service } = build();
    await service.onModuleInit();
    service.port.isOpen = true;
    fakePort.close.mockImplementationOnce((cb: (err?: Error) => void) => {
      cb(new Error('close boom'));
    });
    const errorSpy = vi.spyOn(service.logger, 'error').mockImplementation(() => undefined);
    service.closePort();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('opens the configured override path instead of listed ports', async () => {
    const { service } = build('/dev/custom-uart');
    await service.onModuleInit();
    expect(serialPortCtor).toHaveBeenCalledWith(expect.objectContaining({ path: '/dev/custom-uart' }));
  });

  it('does not open /dev/ttyUSB0 on Darwin when no adapter is listed', async () => {
    listMock.mockResolvedValue([]);
    vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin');
    const { service } = build();
    const errorSpy = vi.spyOn(service.logger, 'error').mockImplementation(() => undefined);
    await service.onModuleInit();
    expect(serialPortCtor).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('No FTDI DMX serial adapter found'));
  });

  it('treats SerialPort.list failures as an empty list', async () => {
    listMock.mockRejectedValue(new Error('usb enumeration failed'));
    vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin');
    const { service } = build();
    const warnSpy = vi.spyOn(service.logger, 'warn').mockImplementation(() => undefined);
    await service.onModuleInit();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('SerialPort.list() failed'));
    expect(serialPortCtor).not.toHaveBeenCalled();
  });
});
