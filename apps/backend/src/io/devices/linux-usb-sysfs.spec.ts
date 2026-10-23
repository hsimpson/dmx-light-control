import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { alsaCardFromMidiPortName, readMidiPortUsbIdentity, readTtyUsbIdentity } from './linux-usb-sysfs';

async function writeUsbDevice(dir: string, attributes: Record<string, string>): Promise<void> {
  await mkdir(dir, { recursive: true });
  for (const [name, value] of Object.entries(attributes)) {
    await writeFile(join(dir, name), `${value}\n`);
  }
}

describe('alsaCardFromMidiPortName', () => {
  it.each([
    ['APC mini mk2:APC mini mk2 Control 28:0', 3],
    ['APC mini mk2:APC mini mk2 Notes 28:1', 3],
    ['Card zero:Port 16:0', 0],
    ['Second device of card 1:Port 21:0', 1],
  ])('GIVEN %s WHEN parsed THEN card %i', (portName, card) => {
    expect(alsaCardFromMidiPortName(portName)).toBe(card);
  });

  it.each(['Midi Through:Midi Through Port-0 14:0', 'PipeWire-System:input 144:0', 'no client suffix'])(
    'GIVEN non-card client %s WHEN parsed THEN null',
    portName => {
      expect(alsaCardFromMidiPortName(portName)).toBeNull();
    },
  );
});

describe('linux USB sysfs identity', () => {
  let sysRoot: string;
  let usbBus: string;

  beforeEach(async () => {
    sysRoot = await mkdtemp(join(tmpdir(), 'usb-sysfs-'));
    usbBus = join(sysRoot, 'devices', 'pci0000:80', 'usb3');

    await writeUsbDevice(join(usbBus, '3-9'), {
      idVendor: '09e8',
      idProduct: '004f',
      manufacturer: 'AKAI professional',
      product: 'APC mini mk2',
      serial: 'Ver00.10',
    });
    await mkdir(join(usbBus, '3-9', '3-9:1.0'), { recursive: true });
    await mkdir(join(sysRoot, 'class', 'sound', 'card3'), { recursive: true });
    await symlink(join(usbBus, '3-9', '3-9:1.0'), join(sysRoot, 'class', 'sound', 'card3', 'device'));

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
  });

  afterEach(async () => {
    await rm(sysRoot, { recursive: true, force: true });
  });

  it('GIVEN an ALSA MIDI port WHEN resolved THEN returns the parent USB device identity', async () => {
    await expect(readMidiPortUsbIdentity('APC mini mk2:APC mini mk2 Control 28:0', sysRoot)).resolves.toEqual({
      vendorId: '09e8',
      productId: '004f',
      name: 'APC mini mk2',
      manufacturer: 'AKAI professional',
      serial: 'Ver00.10',
      usbLocation: '3-9',
    });
  });

  it('GIVEN a USB tty WHEN resolved THEN returns the FTDI identity', async () => {
    await expect(readTtyUsbIdentity('/dev/ttyUSB0', sysRoot)).resolves.toEqual({
      vendorId: '0403',
      productId: '6001',
      name: 'FT232R USB UART',
      manufacturer: 'FTDI',
      serial: 'A50285BI',
      usbLocation: '3-10',
    });
  });

  it('GIVEN a USB device without serial or product WHEN resolved THEN those fields fall back', async () => {
    await rm(join(usbBus, '3-9', 'serial'));
    await rm(join(usbBus, '3-9', 'product'));

    const identity = await readMidiPortUsbIdentity('APC:APC 28:0', sysRoot);

    expect(identity).toMatchObject({ name: '3-9', serial: null });
  });

  it('GIVEN no sysfs entry WHEN resolved THEN null', async () => {
    await expect(readTtyUsbIdentity('/dev/ttyS0', sysRoot)).resolves.toBeNull();
    await expect(readMidiPortUsbIdentity('Other:Port 40:0', sysRoot)).resolves.toBeNull();
    await expect(readMidiPortUsbIdentity('Midi Through:Port 14:0', sysRoot)).resolves.toBeNull();
  });

  it('GIVEN a non-USB device chain WHEN resolved THEN null', async () => {
    await mkdir(join(sysRoot, 'devices', 'platform', 'serial8250', 'tty', 'ttyS1'), { recursive: true });
    await mkdir(join(sysRoot, 'class', 'tty', 'ttyS1'), { recursive: true });
    await symlink(
      join(sysRoot, 'devices', 'platform', 'serial8250', 'tty', 'ttyS1'),
      join(sysRoot, 'class', 'tty', 'ttyS1', 'device'),
    );

    await expect(readTtyUsbIdentity('/dev/ttyS1', sysRoot)).resolves.toBeNull();
  });
});
