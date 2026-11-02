import { AppEventEmitter } from '@/events/app-event-emitter';
import { EventEmitter2 } from 'eventemitter2';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SerialSendService } from './serial-send.service';

const { fakeSerial } = vi.hoisted(() => {
  class FakeSerialPort {
    public isOpen = false;
    public readonly writes: Uint8Array[] = [];
    public readonly breaks: boolean[] = [];
    public readonly path: string;
    private readonly handlers = new Map<string, ((arg?: unknown) => void)[]>();

    public constructor(options: { path: string }) {
      this.path = options.path;
      fakeSerial.ports.push(this);
    }

    public open(cb: (err: Error | null) => void): void {
      const error = fakeSerial.openErrors.get(this.path);
      this.isOpen = !error;
      cb(error ?? null);
    }

    public set(options: { brk: boolean }, cb: (err: Error | null) => void): void {
      this.breaks.push(options.brk);
      cb(fakeSerial.setError);
    }

    public write(data: Buffer, cb: (err: Error | null) => void): void {
      this.writes.push(Uint8Array.from(data));
      cb(null);
    }

    public close(cb: (err: Error | null) => void): void {
      this.isOpen = false;
      cb(null);
      this.trigger('close');
    }

    public on(event: string, handler: (arg?: unknown) => void): this {
      this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);
      return this;
    }

    public trigger(event: string, arg?: unknown): void {
      for (const handler of this.handlers.get(event) ?? []) handler(arg);
    }
  }

  return {
    fakeSerial: {
      FakeSerialPort,
      ports: [] as FakeSerialPort[],
      openErrors: new Map<string, Error>(),
      setError: null as Error | null,
    },
  };
});

vi.mock('serialport', () => ({ SerialPort: fakeSerial.FakeSerialPort }));

function portAt(path: string) {
  const port = fakeSerial.ports.find(candidate => candidate.path === path);
  if (!port) throw new Error(`no port opened for ${path}`);
  return port;
}

describe('SerialSendService', () => {
  let eventEmitter: AppEventEmitter;
  let service: SerialSendService;

  beforeEach(() => {
    vi.useFakeTimers();
    fakeSerial.ports.length = 0;
    fakeSerial.openErrors.clear();
    fakeSerial.setError = null;
    eventEmitter = new AppEventEmitter(new EventEmitter2());
    service = new SerialSendService(eventEmitter);
    service.onModuleInit();
  });

  afterEach(() => {
    service.onModuleDestroy();
    vi.useRealTimers();
  });

  it('GIVEN an opened port WHEN the loop ticks THEN it sends BREAK, MAB and the 513-byte frame', async () => {
    await expect(service.open('/dev/ttyUSB0')).resolves.toBe(true);

    eventEmitter.emit('dmx.channelValues', [{ channel: 1, value: 255 }]);
    await vi.advanceTimersByTimeAsync(40);

    const port = portAt('/dev/ttyUSB0');
    expect(port.breaks.slice(0, 2)).toEqual([true, false]);
    expect(port.writes[0]).toHaveLength(513);
    expect(port.writes[0]?.[0]).toBe(0);
    expect(port.writes[0]?.[1]).toBe(255);
  });

  it('GIVEN channel values before a port opens WHEN a second port opens later THEN both send the same universe', async () => {
    eventEmitter.emit('dmx.channelValues', [{ channel: 5, value: 42 }]);
    await service.open('/dev/ttyUSB0');
    await service.open('/dev/ttyUSB1');

    await vi.advanceTimersByTimeAsync(40);

    expect(portAt('/dev/ttyUSB0').writes[0]?.[5]).toBe(42);
    expect(portAt('/dev/ttyUSB1').writes[0]?.[5]).toBe(42);
  });

  it('GIVEN out-of-range channel values WHEN applied THEN they are ignored', async () => {
    await service.open('/dev/ttyUSB0');

    eventEmitter.emit('dmx.channelValues', [
      { channel: 0, value: 10 },
      { channel: 513, value: 10 },
      { channel: 2, value: 256 },
      { channel: 3, value: -1 },
      { channel: 512, value: 7 },
    ]);
    await vi.advanceTimersByTimeAsync(40);

    const frame = portAt('/dev/ttyUSB0').writes[0];
    expect(frame?.[0]).toBe(0);
    expect(frame?.[2]).toBe(0);
    expect(frame?.[3]).toBe(0);
    expect(frame?.[512]).toBe(7);
  });

  it('GIVEN an already open path WHEN opened again THEN no second port is created', async () => {
    await service.open('/dev/ttyUSB0');
    await service.open('/dev/ttyUSB0');

    expect(fakeSerial.ports).toHaveLength(1);
    expect(service.openPaths()).toContain('/dev/ttyUSB0');
  });

  it('GIVEN the port cannot be opened WHEN opening THEN returns false and stays closed', async () => {
    fakeSerial.openErrors.set('/dev/ttyUSB0', new Error('Permission denied'));

    await expect(service.open('/dev/ttyUSB0')).resolves.toBe(false);

    expect(service.openPaths()).not.toContain('/dev/ttyUSB0');
  });

  it('GIVEN two ports WHEN one errors THEN only that one is dropped and the other keeps sending', async () => {
    await service.open('/dev/ttyUSB0');
    await service.open('/dev/ttyUSB1');

    portAt('/dev/ttyUSB0').trigger('error', new Error('device unplugged'));
    await vi.advanceTimersByTimeAsync(40);

    expect(service.openPaths()).not.toContain('/dev/ttyUSB0');
    expect(service.openPaths()).toContain('/dev/ttyUSB1');
    expect(portAt('/dev/ttyUSB0').writes).toHaveLength(0);
    expect(portAt('/dev/ttyUSB1').writes.length).toBeGreaterThan(0);
  });

  it('GIVEN an unplugged port WHEN the OS closes it THEN it is forgotten', async () => {
    await service.open('/dev/ttyUSB0');
    const port = portAt('/dev/ttyUSB0');

    port.isOpen = false;
    port.trigger('close');

    expect(service.openPaths()).not.toContain('/dev/ttyUSB0');
  });

  it('GIVEN an open port WHEN closed THEN nothing more is sent', async () => {
    await service.open('/dev/ttyUSB0');

    service.close('/dev/ttyUSB0');
    await vi.advanceTimersByTimeAsync(100);

    expect(service.openPaths()).not.toContain('/dev/ttyUSB0');
    expect(portAt('/dev/ttyUSB0').writes).toHaveLength(0);
  });

  it('GIVEN setting BREAK fails WHEN the loop ticks THEN no data is written', async () => {
    await service.open('/dev/ttyUSB0');
    fakeSerial.setError = new Error('ioctl failed');

    await vi.advanceTimersByTimeAsync(100);

    expect(portAt('/dev/ttyUSB0').writes).toHaveLength(0);
  });

  it('GIVEN an unknown path WHEN closed THEN nothing happens', () => {
    expect(() => {
      service.close('/dev/missing');
    }).not.toThrow();
  });
});
