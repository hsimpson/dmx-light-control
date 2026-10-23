import { AppEventEmitter } from '@/events/app-event-emitter';
import { MidiService } from '@/io/midi/midi.service';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IoDeviceDiscoveryService } from './io-device-discovery.service';
import { IoDeviceKind } from './match-io-devices';

const { listSerialPorts, midiPortNames, runCommandMock } = vi.hoisted(() => ({
  listSerialPorts: vi.fn<() => Promise<Record<string, string | undefined>[]>>(),
  midiPortNames: { value: [] as string[] },
  runCommandMock: vi.fn<(file: string, args: readonly string[]) => Promise<string>>(),
}));

vi.mock('./midi-identity/run-command', () => ({ runCommand: runCommandMock }));

vi.mock('serialport', () => ({
  SerialPort: class {
    public static list = listSerialPorts;
  },
}));

vi.mock('midi', () => {
  class Port {
    public getPortCount(): number {
      return midiPortNames.value.length;
    }
    public getPortName(index: number): string {
      return midiPortNames.value[index] ?? '';
    }
    public on(): this {
      return this;
    }
  }
  return { default: { Input: Port, Output: Port } };
});

const originalPlatform = process.platform;

function setPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', { value: platform });
}

async function writeUsbDevice(dir: string, attributes: Record<string, string>): Promise<void> {
  await mkdir(dir, { recursive: true });
  for (const [name, value] of Object.entries(attributes)) {
    await writeFile(join(dir, name), value);
  }
}

describe('IoDeviceDiscoveryService', () => {
  let sysRoot: string;
  let service: IoDeviceDiscoveryService;

  beforeEach(async () => {
    sysRoot = await mkdtemp(join(tmpdir(), 'io-discovery-'));
    const usbBus = join(sysRoot, 'devices', 'usb3');
    await writeUsbDevice(join(usbBus, '3-9'), {
      idVendor: '09e8',
      idProduct: '004f',
      manufacturer: 'AKAI professional',
      product: 'APC mini mk2',
      serial: 'Ver00.10',
    });
    await mkdir(join(sysRoot, 'class', 'sound', 'card3'), { recursive: true });
    await symlink(join(usbBus, '3-9'), join(sysRoot, 'class', 'sound', 'card3', 'device'));
    await writeUsbDevice(join(usbBus, '3-10'), {
      idVendor: '0403',
      idProduct: '6001',
      manufacturer: 'FTDI',
      product: 'FT232R USB UART',
      serial: 'A50285BI',
    });
    await mkdir(join(usbBus, '3-10', '3-10:1.0', 'ttyUSB0'), { recursive: true });
    await mkdir(join(sysRoot, 'class', 'tty', 'ttyUSB0'), { recursive: true });
    await symlink(join(usbBus, '3-10', '3-10:1.0', 'ttyUSB0'), join(sysRoot, 'class', 'tty', 'ttyUSB0', 'device'));

    listSerialPorts.mockResolvedValue([
      { path: '/dev/ttyS0' },
      { path: '/dev/ttyUSB0', vendorId: '0403', productId: '6001', serialNumber: 'A50285BI', manufacturer: 'FTDI' },
    ]);
    midiPortNames.value = [
      'Midi Through:Midi Through Port-0 14:0',
      'APC mini mk2:APC mini mk2 Control 28:0',
      'APC mini mk2:APC mini mk2 Notes 28:1',
    ];

    const eventEmitter = { on: vi.fn<() => void>() } as unknown as AppEventEmitter;
    service = new IoDeviceDiscoveryService(new MidiService(eventEmitter), sysRoot);
  });

  afterEach(async () => {
    setPlatform(originalPlatform);
    runCommandMock.mockReset();
    await rm(sysRoot, { recursive: true, force: true });
  });

  it('GIVEN Linux WHEN listing THEN returns USB serial ports and the primary port of each USB MIDI device', async () => {
    setPlatform('linux');

    await expect(service.listAvailable()).resolves.toEqual([
      {
        kind: IoDeviceKind.DmxSerial,
        handle: '/dev/ttyUSB0',
        vendorId: '0403',
        productId: '6001',
        name: 'FT232R USB UART',
        manufacturer: 'FTDI',
        serial: 'A50285BI',
        usbLocation: '3-10',
      },
      {
        kind: IoDeviceKind.Midi,
        handle: 'APC mini mk2:APC mini mk2 Control 28:0',
        vendorId: '09e8',
        productId: '004f',
        name: 'APC mini mk2',
        manufacturer: 'AKAI professional',
        serial: 'Ver00.10',
        usbLocation: '3-9',
      },
    ]);
  });

  it('GIVEN Linux and a USB serial port without sysfs entry WHEN listing THEN falls back to serialport fields', async () => {
    setPlatform('linux');
    listSerialPorts.mockResolvedValue([{ path: '/dev/ttyACM0', vendorId: '2341', productId: '0043' }]);
    midiPortNames.value = [];

    await expect(service.listAvailable()).resolves.toEqual([
      expect.objectContaining({ handle: '/dev/ttyACM0', name: 'USB serial', serial: null, usbLocation: null }),
    ]);
  });

  it('GIVEN macOS WHEN listing THEN uses serialport identity, the callout path and ioreg for MIDI', async () => {
    setPlatform('darwin');
    runCommandMock.mockResolvedValue(`<?xml version="1.0"?><plist version="1.0"><array><dict>
      <key>USB Product Name</key><string>APC mini mk2</string>
      <key>USB Serial Number</key><string>Ver00.10</string>
      <key>idVendor</key><integer>2536</integer>
      <key>idProduct</key><integer>79</integer>
      <key>locationID</key><integer>336592896</integer>
    </dict></array></plist>`);
    listSerialPorts.mockResolvedValue([
      {
        path: '/dev/tty.usbserial-A50285BI',
        vendorId: '0403',
        productId: '6001',
        serialNumber: 'A50285BI',
        manufacturer: 'FTDI',
        locationId: '14100000',
      },
    ]);
    midiPortNames.value = ['APC mini mk2 Control'];

    await expect(service.listAvailable()).resolves.toEqual([
      {
        kind: IoDeviceKind.DmxSerial,
        handle: '/dev/cu.usbserial-A50285BI',
        vendorId: '0403',
        productId: '6001',
        name: 'FTDI',
        manufacturer: 'FTDI',
        serial: 'A50285BI',
        usbLocation: '14100000',
      },
      {
        kind: IoDeviceKind.Midi,
        handle: 'APC mini mk2 Control',
        vendorId: '09e8',
        productId: '004f',
        name: 'APC mini mk2',
        manufacturer: null,
        serial: 'Ver00.10',
        usbLocation: '14100000',
      },
    ]);
    expect(runCommandMock).toHaveBeenCalledWith('ioreg', expect.arrayContaining(['-c', 'IOUSBHostDevice']));
  });

  it('GIVEN Windows WHEN listing THEN pairs MIDI ports with Get-PnpDevice output', async () => {
    setPlatform('win32');
    listSerialPorts.mockResolvedValue([]);
    midiPortNames.value = ['APC mini mk2 Control'];
    runCommandMock.mockResolvedValue(
      JSON.stringify({ FriendlyName: 'APC mini mk2', InstanceId: 'USB\\VID_09E8&PID_004F&MI_00\\7&A&0&0000' }),
    );

    await expect(service.listAvailable()).resolves.toEqual([
      expect.objectContaining({ handle: 'APC mini mk2 Control', vendorId: '09e8', usbLocation: '7&A&0&0000' }),
    ]);
    expect(runCommandMock).toHaveBeenCalledWith('powershell', expect.arrayContaining(['-NoProfile']));
  });

  it('GIVEN the USB listing command fails WHEN listing THEN falls back to name-only MIDI devices', async () => {
    setPlatform('darwin');
    listSerialPorts.mockResolvedValue([]);
    midiPortNames.value = ['APC mini mk2 Control'];
    runCommandMock.mockRejectedValue(new Error('timeout'));

    await expect(service.listAvailable()).resolves.toEqual([
      {
        kind: IoDeviceKind.Midi,
        handle: 'APC mini mk2 Control',
        vendorId: null,
        productId: null,
        name: 'APC mini mk2 Control',
        manufacturer: null,
        serial: null,
        usbLocation: null,
      },
    ]);
  });

  it('GIVEN an unsupported platform WHEN listing THEN MIDI is name-only without running a command', async () => {
    setPlatform('freebsd');
    listSerialPorts.mockResolvedValue([]);
    midiPortNames.value = ['Keys'];

    await expect(service.listAvailable()).resolves.toEqual([expect.objectContaining({ name: 'Keys', serial: null })]);
    expect(runCommandMock).not.toHaveBeenCalled();
  });
});
