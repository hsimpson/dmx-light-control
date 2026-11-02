import { AppEventEmitter } from '@/events/app-event-emitter';
import { MidiService } from '@/io/midi/midi.service';
import { SerialSendService } from '@/io/serial/serial-send.service';
import { EventEmitter2 } from 'eventemitter2';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { IoDeviceDiscoveryService } from './io-device-discovery.service';
import { IO_DEVICE_POLL_INTERVAL_MS, IoDeviceManagerService } from './io-device-manager.service';
import { IoDeviceKind, IoDeviceStatus, type AvailableIoDevice, type IoDeviceIdentity } from './match-io-devices';

const { hardware } = vi.hoisted(() => {
  const state = {
    midiPorts: [] as string[],
    serialOpenFailures: new Set<string>(),
    openSerialPaths: new Set<string>(),
  };

  class FakeSerialPort {
    public isOpen = false;
    private readonly handlers = new Map<string, (() => void)[]>();
    public constructor(private readonly options: { path: string }) {}
    public open(cb: (err: Error | null) => void): void {
      const failed = state.serialOpenFailures.has(this.options.path);
      this.isOpen = !failed;
      if (!failed) state.openSerialPaths.add(this.options.path);
      cb(failed ? new Error('EACCES') : null);
    }
    public close(cb: (err: Error | null) => void): void {
      this.isOpen = false;
      state.openSerialPaths.delete(this.options.path);
      cb(null);
      for (const handler of this.handlers.get('close') ?? []) handler();
    }
    public on(event: string, handler: () => void): this {
      this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);
      return this;
    }
    public set(_options: unknown, cb: (err: Error | null) => void): void {
      cb(null);
    }
    public write(_data: unknown, cb: (err: Error | null) => void): void {
      cb(null);
    }
  }

  class FakeMidiPort {
    public opened = false;
    public readonly sent: number[][] = [];
    public getPortCount(): number {
      return state.midiPorts.length;
    }
    public getPortName(index: number): string {
      return state.midiPorts[index] ?? '';
    }
    public openPort(): void {
      this.opened = true;
    }
    public closePort(): void {
      this.opened = false;
    }
    public on(): this {
      return this;
    }
    public removeAllListeners(): this {
      return this;
    }
    public sendMessage(message: number[]): void {
      this.sent.push(message);
    }
  }

  return { hardware: { state, FakeSerialPort, FakeMidiPort } };
});

vi.mock('serialport', () => ({ SerialPort: hardware.FakeSerialPort }));
vi.mock('midi', () => ({ default: { Input: hardware.FakeMidiPort, Output: hardware.FakeMidiPort } }));

const ftdi: IoDeviceIdentity = {
  kind: IoDeviceKind.DmxSerial,
  vendorId: '0403',
  productId: '6001',
  name: 'FT232R USB UART',
  manufacturer: 'FTDI',
  serial: 'A50285BI',
  usbLocation: '3-10',
};

const apc: IoDeviceIdentity = {
  kind: IoDeviceKind.Midi,
  vendorId: '09e8',
  productId: '004f',
  name: 'APC mini mk2',
  manufacturer: 'AKAI professional',
  serial: 'Ver00.10',
  usbLocation: '3-9',
};

const APC_PORT = 'APC mini mk2:APC mini mk2 Control 28:0';

describe('IoDeviceManagerService', () => {
  let eventEmitter: AppEventEmitter;
  let serialSend: SerialSendService;
  let midi: MidiService;
  let available: AvailableIoDevice[];
  let listAvailable: MockInstance<IoDeviceDiscoveryService['listAvailable']>;
  let manager: IoDeviceManagerService;

  function plug(device: IoDeviceIdentity, handle: string, usbLocation = device.usbLocation): void {
    available.push({ ...device, usbLocation, handle });
    if (device.kind === IoDeviceKind.Midi) hardware.state.midiPorts.push(handle);
  }

  function unplug(handle: string): void {
    available = available.filter(device => device.handle !== handle);
    hardware.state.midiPorts = hardware.state.midiPorts.filter(name => name !== handle);
  }

  async function activate(devices: IoDeviceIdentity[]): Promise<void> {
    eventEmitter.emit('project.ioDevicesActivated', { devices });
    await vi.advanceTimersByTimeAsync(0);
  }

  function statuses() {
    return manager.statuses().map(match => [match.device.name, match.status]);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    available = [];
    Object.assign(hardware.state, { midiPorts: [], serialOpenFailures: new Set(), openSerialPaths: new Set() });

    eventEmitter = new AppEventEmitter(new EventEmitter2());
    serialSend = new SerialSendService(eventEmitter);
    midi = new MidiService(eventEmitter);
    const discovery = new IoDeviceDiscoveryService(midi, '/nonexistent');
    listAvailable = vi.spyOn(discovery, 'listAvailable').mockImplementation(async () => Promise.resolve(available));
    manager = new IoDeviceManagerService(discovery, serialSend, midi, eventEmitter);
    manager.onModuleInit();
  });

  afterEach(() => {
    manager.onModuleDestroy();
    serialSend.onModuleDestroy();
    midi.onModuleDestroy();
    vi.useRealTimers();
  });

  it('GIVEN configured devices are plugged in WHEN the project activates THEN both are opened and connected', async () => {
    plug(ftdi, '/dev/ttyUSB0');
    plug(apc, APC_PORT);

    await activate([ftdi, apc]);

    expect(serialSend.openPaths()).toEqual(['/dev/ttyUSB0']);
    expect(midi.openPortNames()).toEqual([APC_PORT]);
    expect(statuses()).toEqual([
      ['FT232R USB UART', IoDeviceStatus.Connected],
      ['APC mini mk2', IoDeviceStatus.Connected],
    ]);
  });

  it('GIVEN a connected output WHEN unplugged and replugged into another port THEN missing, then reconnected', async () => {
    plug(ftdi, '/dev/ttyUSB0');
    await activate([ftdi]);

    unplug('/dev/ttyUSB0');
    await vi.advanceTimersByTimeAsync(IO_DEVICE_POLL_INTERVAL_MS);
    const whileUnplugged = statuses();
    const pathsWhileUnplugged = serialSend.openPaths();

    plug(ftdi, '/dev/ttyUSB1', '3-2');
    await vi.advanceTimersByTimeAsync(IO_DEVICE_POLL_INTERVAL_MS);

    expect(whileUnplugged).toEqual([['FT232R USB UART', IoDeviceStatus.Missing]]);
    expect(pathsWhileUnplugged).toEqual([]);
    expect(serialSend.openPaths()).toEqual(['/dev/ttyUSB1']);
    expect(statuses()).toEqual([['FT232R USB UART', IoDeviceStatus.Connected]]);
  });

  it('GIVEN a MIDI device WHEN unplugged THEN its ports are closed on the next poll', async () => {
    plug(apc, APC_PORT);
    await activate([apc]);

    unplug(APC_PORT);
    await vi.advanceTimersByTimeAsync(IO_DEVICE_POLL_INTERVAL_MS);

    expect(midi.openPortNames()).toEqual([]);
    expect(statuses()).toEqual([['APC mini mk2', IoDeviceStatus.Missing]]);
  });

  it('GIVEN an active project WHEN a project without devices activates THEN everything closes and polling stops', async () => {
    plug(ftdi, '/dev/ttyUSB0');
    plug(apc, APC_PORT);
    await activate([ftdi, apc]);

    await activate([]);
    listAvailable.mockClear();
    await vi.advanceTimersByTimeAsync(IO_DEVICE_POLL_INTERVAL_MS * 3);

    expect(serialSend.openPaths()).toEqual([]);
    expect(midi.openPortNames()).toEqual([]);
    expect(manager.statuses()).toEqual([]);
    expect(listAvailable).not.toHaveBeenCalled();
  });

  it('GIVEN a matched output that cannot be opened WHEN reconciled THEN it is reported missing and retried', async () => {
    hardware.state.serialOpenFailures.add('/dev/ttyUSB0');
    plug(ftdi, '/dev/ttyUSB0');

    await activate([ftdi]);
    const firstAttempt = statuses();
    hardware.state.serialOpenFailures.clear();
    await vi.advanceTimersByTimeAsync(IO_DEVICE_POLL_INTERVAL_MS);

    expect(firstAttempt).toEqual([['FT232R USB UART', IoDeviceStatus.Missing]]);
    expect(statuses()).toEqual([['FT232R USB UART', IoDeviceStatus.Connected]]);
  });

  it('GIVEN two identical devices on unknown ports WHEN reconciled THEN ambiguous and nothing opened', async () => {
    plug(apc, 'APC:APC Control 28:0', '3-7');
    plug(apc, 'APC:APC Control 32:0', '3-8');

    await activate([apc]);

    expect(statuses()).toEqual([['APC mini mk2', IoDeviceStatus.Ambiguous]]);
    expect(midi.openPortNames()).toEqual([]);
  });

  it('GIVEN discovery fails WHEN polling THEN previous state is kept and it retries', async () => {
    plug(ftdi, '/dev/ttyUSB0');
    await activate([ftdi]);
    listAvailable.mockRejectedValueOnce(new Error('udev unavailable'));

    await vi.advanceTimersByTimeAsync(IO_DEVICE_POLL_INTERVAL_MS);
    const afterFailure = serialSend.openPaths();
    await vi.advanceTimersByTimeAsync(IO_DEVICE_POLL_INTERVAL_MS);

    expect(afterFailure).toEqual(['/dev/ttyUSB0']);
    expect(listAvailable).toHaveBeenCalledTimes(3);
    expect(statuses()).toEqual([['FT232R USB UART', IoDeviceStatus.Connected]]);
  });

  it('GIVEN the module is destroyed WHEN time passes THEN no further polls run', async () => {
    plug(ftdi, '/dev/ttyUSB0');
    await activate([ftdi]);

    manager.onModuleDestroy();
    listAvailable.mockClear();
    await vi.advanceTimersByTimeAsync(IO_DEVICE_POLL_INTERVAL_MS * 3);
    await manager.reconcile();

    expect(listAvailable).not.toHaveBeenCalled();
  });
});
