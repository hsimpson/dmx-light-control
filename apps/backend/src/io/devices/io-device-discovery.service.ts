import { MidiService } from '@/io/midi/midi.service';
import { SoundInputService } from '@/io/sound-input/sound-input.service';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { SerialPort } from 'serialport';
import { readMidiPortUsbIdentity, readTtyUsbIdentity } from './linux-usb-sysfs';
import { IoDeviceKind, type AvailableIoDevice } from './match-io-devices';
import { DEVICE_INQUIRY, isApcMiniMk2, parseApcMiniMk2Serial } from './midi-identity/apc-mini-mk2';
import { IOREG_ARGS, parseIoregUsbDevices } from './midi-identity/macos-ioreg';
import { pairMidiPortsWithUsbDevices } from './midi-identity/pair-midi-ports';
import { runCommand } from './midi-identity/run-command';
import { parsePnpMediaDevices, PNP_MEDIA_ARGS } from './midi-identity/windows-pnp';
import { normalizeUsbId, type UsbIdentity } from './usb-identity';

export const IO_DEVICES_SYS_ROOT = Symbol('IO_DEVICES_SYS_ROOT');

type ListedSerialPort = Awaited<ReturnType<typeof SerialPort.list>>[number];

type UsbListing = {
  command: string;
  args: readonly string[];
  parse: (output: string) => UsbIdentity[];
};

const USB_LISTINGS: Partial<Record<NodeJS.Platform, UsbListing>> = {
  darwin: { command: 'ioreg', args: IOREG_ARGS, parse: parseIoregUsbDevices },
  win32: { command: 'powershell', args: PNP_MEDIA_ARGS, parse: parsePnpMediaDevices },
};

// ALSA port 0 of a client is the device's primary port (APC mini mk2: "Control").
const ALSA_PRIMARY_PORT = /\s\d+:0$/;
const UNIT_SERIAL_TIMEOUT_MS = 1000;

@Injectable()
export class IoDeviceDiscoveryService {
  private readonly logger = new Logger(IoDeviceDiscoveryService.name);
  private readonly unitSerials = new Map<string, string>();

  public constructor(
    private readonly midiService: MidiService,
    private readonly soundInput: SoundInputService,
    @Inject(IO_DEVICES_SYS_ROOT) private readonly sysRoot: string,
  ) {}

  public async listAvailable(): Promise<AvailableIoDevice[]> {
    const [serial, midi] = await Promise.all([this.listSerialDevices(), this.listMidiDevices()]);
    return [...serial, ...midi, ...this.listSoundInputs()];
  }

  // shortcut: sound inputs match by name only (no USB ids); identical interfaces show as Ambiguous.
  private listSoundInputs(): AvailableIoDevice[] {
    return this.soundInput
      .listInputs()
      .map(({ name, maxInputChannels }) => ({ ...nameOnlyDevice(IoDeviceKind.SoundInput, name), maxInputChannels }));
  }

  private async listSerialDevices(): Promise<AvailableIoDevice[]> {
    const ports = (await SerialPort.list()).filter(port => port.vendorId);
    const devices = await Promise.all(
      ports.map(async port => ({
        ...((await this.readLinuxTtyIdentity(port.path)) ?? serialPortIdentity(port)),
        kind: IoDeviceKind.DmxSerial,
        handle: darwinCalloutPath(port.path),
      })),
    );
    return devices;
  }

  private async listMidiDevices(): Promise<AvailableIoDevice[]> {
    return this.withUnitSerials(await this.listUsbMidiDevices(this.midiService.listPortNames()));
  }

  // shortcut: a unit replaced on the same port and USB location within one poll keeps the old serial; only re-probing every poll would catch it.
  private async withUnitSerials(devices: AvailableIoDevice[]): Promise<AvailableIoDevice[]> {
    const listed = new Set(devices.map(unitKey));
    for (const key of this.unitSerials.keys()) {
      if (!listed.has(key)) this.unitSerials.delete(key);
    }
    return Promise.all(
      devices.map(async device => {
        if (!isApcMiniMk2(device)) return device;
        const serial =
          this.unitSerials.get(unitKey(device)) ??
          (await this.midiService.probe(device.handle, DEVICE_INQUIRY, parseApcMiniMk2Serial, UNIT_SERIAL_TIMEOUT_MS));
        if (!serial) return device;
        this.unitSerials.set(unitKey(device), serial);
        return { ...device, serial };
      }),
    );
  }

  private async listUsbMidiDevices(portNames: string[]): Promise<AvailableIoDevice[]> {
    if (process.platform === 'linux') {
      return this.listLinuxMidiDevices(portNames);
    }
    const usbListing = USB_LISTINGS[process.platform];
    return usbListing ? this.pairWithUsbListing(portNames, usbListing) : nameOnlyMidiDevices(portNames);
  }

  private async listLinuxMidiDevices(portNames: string[]): Promise<AvailableIoDevice[]> {
    const devices = await Promise.all(
      portNames
        .filter(name => ALSA_PRIMARY_PORT.test(name))
        .map(async name => {
          const identity = await readMidiPortUsbIdentity(name, this.sysRoot);
          return identity && { ...identity, kind: IoDeviceKind.Midi, handle: name };
        }),
    );
    return devices.filter(device => device !== null);
  }

  private async pairWithUsbListing(
    portNames: string[],
    { command, args, parse }: UsbListing,
  ): Promise<AvailableIoDevice[]> {
    try {
      return pairMidiPortsWithUsbDevices(portNames, parse(await runCommand(command, args)));
    } catch (error) {
      this.logger.warn(
        `MIDI USB lookup via ${command} failed, using port names only: ${error instanceof Error ? error.message : String(error)}`,
      );
      return nameOnlyMidiDevices(portNames);
    }
  }

  private async readLinuxTtyIdentity(path: string): Promise<UsbIdentity | null> {
    return process.platform === 'linux' ? readTtyUsbIdentity(path, this.sysRoot) : null;
  }
}

// Windows port names carry an index that shifts on unplug, so the name alone can point at another unit.
function unitKey({ handle, usbLocation }: AvailableIoDevice): string {
  return `${handle}|${usbLocation}`;
}

function serialPortIdentity(port: ListedSerialPort): UsbIdentity {
  return {
    vendorId: normalizeUsbId(port.vendorId),
    productId: normalizeUsbId(port.productId),
    name: port.manufacturer ?? 'USB serial',
    manufacturer: port.manufacturer ?? null,
    serial: port.serialNumber ?? null,
    usbLocation: port.locationId ?? null,
  };
}

function nameOnlyMidiDevices(portNames: readonly string[]): AvailableIoDevice[] {
  return portNames.map(name => nameOnlyDevice(IoDeviceKind.Midi, name));
}

function nameOnlyDevice(kind: IoDeviceKind, name: string): AvailableIoDevice {
  return {
    kind,
    handle: name,
    vendorId: null,
    productId: null,
    name,
    manufacturer: null,
    serial: null,
    usbLocation: null,
  };
}

function darwinCalloutPath(path: string): string {
  return path.startsWith('/dev/tty.') ? `/dev/cu.${path.slice('/dev/tty.'.length)}` : path;
}
