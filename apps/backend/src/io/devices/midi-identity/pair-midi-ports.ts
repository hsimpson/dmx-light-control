import { IoDeviceKind, type AvailableIoDevice } from '../match-io-devices';
import type { UsbIdentity } from '../usb-identity';

// Windows prefixes duplicate MIDI port names with "2- ", "3- ", ...
const WINDOWS_DUPLICATE_PREFIX = /^\d+- /;

/**
 * Links OS MIDI port names to USB devices whose product name prefixes the port name.
 * Only the first port suffix seen per product counts (e.g. "Control", not "Notes").
 * shortcut: identical devices pair in OS port order with ascending usbLocation, which can swap
 * them if the OS enumerates differently; upgrade with a native CoreMIDI/SetupAPI lookup if that bites.
 */
export function pairMidiPortsWithUsbDevices(
  portNames: readonly string[],
  usbDevices: readonly UsbIdentity[],
): AvailableIoDevice[] {
  const products = [...new Set(usbDevices.map(device => device.name))].sort((a, b) => b.length - a.length);
  const primarySuffix = new Map<string, string>();
  const used = new Map<string, number>();
  const paired: AvailableIoDevice[] = [];

  for (const portName of portNames) {
    const bare = portName.replace(WINDOWS_DUPLICATE_PREFIX, '');
    const product = products.find(name => bare.startsWith(name));
    if (!product) continue;

    const suffix = bare.slice(product.length).trim();
    const primary = primarySuffix.get(product) ?? suffix;
    primarySuffix.set(product, primary);
    if (suffix !== primary) continue;

    const index = used.get(product) ?? 0;
    used.set(product, index + 1);
    const device = usbDevices
      .filter(candidate => candidate.name === product)
      .sort((a, b) => (a.usbLocation ?? '').localeCompare(b.usbLocation ?? ''))[index];
    if (device) paired.push({ ...device, kind: IoDeviceKind.Midi, handle: portName });
  }
  return paired;
}
