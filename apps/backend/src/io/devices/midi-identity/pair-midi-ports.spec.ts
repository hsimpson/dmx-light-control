import { describe, expect, it } from 'vitest';
import { IoDeviceKind } from '../match-io-devices';
import type { UsbIdentity } from '../usb-identity';
import { pairMidiPortsWithUsbDevices } from './pair-midi-ports';

function usb(name: string, usbLocation: string | null): UsbIdentity {
  return { vendorId: '09e8', productId: '004f', name, manufacturer: 'AKAI', serial: 'Ver00.10', usbLocation };
}

describe('pairMidiPortsWithUsbDevices', () => {
  it('GIVEN one device with two ports WHEN paired THEN only the first suffix becomes the device handle', () => {
    const paired = pairMidiPortsWithUsbDevices(
      ['APC mini mk2 Control', 'APC mini mk2 Notes', 'IAC Driver Bus 1'],
      [usb('APC mini mk2', '14100000')],
    );

    expect(paired).toEqual([
      { ...usb('APC mini mk2', '14100000'), kind: IoDeviceKind.Midi, handle: 'APC mini mk2 Control' },
    ]);
  });

  it('GIVEN two identical devices on Windows WHEN paired THEN port order maps to ascending location', () => {
    const paired = pairMidiPortsWithUsbDevices(
      ['APC mini mk2 Control', 'APC mini mk2 Notes', '2- APC mini mk2 Control', '2- APC mini mk2 Notes'],
      [usb('APC mini mk2', '7&B&0&0000'), usb('APC mini mk2', '7&A&0&0000')],
    );

    expect(paired.map(device => [device.handle, device.usbLocation])).toEqual([
      ['APC mini mk2 Control', '7&A&0&0000'],
      ['2- APC mini mk2 Control', '7&B&0&0000'],
    ]);
  });

  it('GIVEN more ports than USB devices WHEN paired THEN extra ports are dropped', () => {
    const paired = pairMidiPortsWithUsbDevices(['Keys', '2- Keys'], [usb('Keys', null)]);

    expect(paired.map(device => device.handle)).toEqual(['Keys']);
  });

  it('GIVEN product names that prefix each other WHEN paired THEN the longest match wins', () => {
    const paired = pairMidiPortsWithUsbDevices(['APC mini mk2 Control'], [usb('APC', '1'), usb('APC mini mk2', '2')]);

    expect(paired.map(device => device.name)).toEqual(['APC mini mk2']);
  });
});
