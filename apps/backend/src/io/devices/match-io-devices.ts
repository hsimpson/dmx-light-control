import { registerEnumType } from '@nestjs/graphql';
import type { UsbIdentity } from './usb-identity';

export enum IoDeviceKind {
  DmxSerial = 'DmxSerial',
  Midi = 'Midi',
}

registerEnumType(IoDeviceKind, {
  name: 'IoDeviceKind',
  description: 'Kind of input/output device',
});

export enum IoDeviceStatus {
  Connected = 'Connected',
  Missing = 'Missing',
  Ambiguous = 'Ambiguous',
}

registerEnumType(IoDeviceStatus, {
  name: 'IoDeviceStatus',
  description: 'Connection state of a configured input/output device',
});

export type IoDeviceIdentity = UsbIdentity & { kind: IoDeviceKind };

/** A device as configured in a project; MIDI devices may name the mapping that interprets their input. */
export type ProjectIoDevice = IoDeviceIdentity & { midiMappingPublicId?: string | null };

export function midiMappingPublicIds(devices: readonly ProjectIoDevice[]): string[] {
  return devices.flatMap(device => (device.midiMappingPublicId ? [device.midiMappingPublicId] : []));
}

/** `handle` is what the OS opens: the serial path or the full RtMidi port name. */
export type AvailableIoDevice = IoDeviceIdentity & { handle: string };

export type IoDeviceMatch<T extends IoDeviceIdentity> = {
  device: T;
  status: IoDeviceStatus;
  handle: string | null;
};

export function matchIoDevices<T extends IoDeviceIdentity>(
  configured: readonly T[],
  available: readonly AvailableIoDevice[],
): IoDeviceMatch<T>[] {
  const unused = new Set(available);
  const handles = new Map<T, string>();

  // Pass 1 claims exact locations first, so a later entry cannot take another entry's device.
  for (const device of configured) {
    const exact = [...unused].find(
      candidate => sameIdentity(device, candidate) && device.usbLocation === candidate.usbLocation,
    );
    if (exact) {
      unused.delete(exact);
      handles.set(device, exact.handle);
    }
  }

  const ambiguous = new Set<T>();
  for (const device of configured) {
    if (handles.has(device)) continue;
    const candidates = [...unused].filter(candidate => sameIdentity(device, candidate));
    const [only] = candidates;
    if (candidates.length === 1 && only) {
      unused.delete(only);
      handles.set(device, only.handle);
    } else if (candidates.length > 1) {
      ambiguous.add(device);
    }
  }

  return configured.map(device => {
    const handle = handles.get(device) ?? null;
    if (handle) return { device, status: IoDeviceStatus.Connected, handle };
    return { device, status: ambiguous.has(device) ? IoDeviceStatus.Ambiguous : IoDeviceStatus.Missing, handle };
  });
}

function sameIdentity(a: IoDeviceIdentity, b: IoDeviceIdentity): boolean {
  return (
    a.kind === b.kind &&
    a.vendorId === b.vendorId &&
    a.productId === b.productId &&
    a.name === b.name &&
    a.serial === b.serial
  );
}
