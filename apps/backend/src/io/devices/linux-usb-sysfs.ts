import { readFile, realpath } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { normalizeUsbId, type UsbIdentity } from './usb-identity';

export const LINUX_SYS_ROOT = '/sys';

// ALSA numbers kernel sequencer clients 16 + 4 * card + device (sound/core/seq).
const ALSA_FIRST_CARD_CLIENT = 16;
const ALSA_CLIENTS_PER_CARD = 4;
const ALSA_LAST_KERNEL_CLIENT = 127;
const MAX_PARENT_HOPS = 4;

/** RtMidi ALSA port names end with `<client>:<port>`, e.g. `APC mini mk2:APC mini mk2 Control 28:0`. */
export function alsaCardFromMidiPortName(portName: string): number | null {
  const match = /\s(\d+):\d+$/.exec(portName);
  const client = Number(match?.[1]);
  if (!match || client < ALSA_FIRST_CARD_CLIENT || client > ALSA_LAST_KERNEL_CLIENT) {
    return null;
  }
  return Math.floor((client - ALSA_FIRST_CARD_CLIENT) / ALSA_CLIENTS_PER_CARD);
}

export async function readMidiPortUsbIdentity(portName: string, sysRoot = LINUX_SYS_ROOT): Promise<UsbIdentity | null> {
  const card = alsaCardFromMidiPortName(portName);
  if (card === null) {
    return null;
  }
  return readUsbIdentityAbove(join(sysRoot, 'class', 'sound', `card${card}`, 'device'));
}

export async function readTtyUsbIdentity(ttyPath: string, sysRoot = LINUX_SYS_ROOT): Promise<UsbIdentity | null> {
  return readUsbIdentityAbove(join(sysRoot, 'class', 'tty', basename(ttyPath), 'device'));
}

async function readUsbIdentityAbove(linkPath: string): Promise<UsbIdentity | null> {
  let dir: string;
  try {
    dir = await realpath(linkPath);
  } catch {
    return null;
  }

  for (let hop = 0; hop <= MAX_PARENT_HOPS; hop++) {
    const vendorId = await readAttribute(dir, 'idVendor');
    if (vendorId !== null) {
      return {
        vendorId: normalizeUsbId(vendorId),
        productId: normalizeUsbId(await readAttribute(dir, 'idProduct')),
        name: (await readAttribute(dir, 'product')) ?? basename(dir),
        manufacturer: await readAttribute(dir, 'manufacturer'),
        serial: await readAttribute(dir, 'serial'),
        usbLocation: basename(dir),
      };
    }
    dir = dirname(dir);
  }
  return null;
}

async function readAttribute(dir: string, name: string): Promise<string | null> {
  try {
    const value = (await readFile(join(dir, name), 'utf8')).trim();
    return value || null;
  } catch {
    return null;
  }
}
