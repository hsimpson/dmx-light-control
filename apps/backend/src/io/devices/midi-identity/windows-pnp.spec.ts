import { describe, expect, it } from 'vitest';
import { parsePnpMediaDevices } from './windows-pnp';

describe('parsePnpMediaDevices', () => {
  it('GIVEN an interface instance id derived from the port WHEN parsed THEN it becomes the usbLocation', () => {
    const json = JSON.stringify([
      {
        FriendlyName: 'APC mini mk2',
        Manufacturer: '(Generic USB Audio)',
        InstanceId: 'USB\\VID_09E8&PID_004F&MI_00\\7&2A3B4C5D&0&0000',
      },
    ]);

    expect(parsePnpMediaDevices(json)).toEqual([
      {
        vendorId: '09e8',
        productId: '004f',
        name: 'APC mini mk2',
        manufacturer: '(Generic USB Audio)',
        serial: null,
        usbLocation: '7&2A3B4C5D&0&0000',
      },
    ]);
  });

  it('GIVEN a single object with a serial-based instance id WHEN parsed THEN it becomes the serial', () => {
    const json = JSON.stringify({ FriendlyName: 'Keys', InstanceId: 'USB\\VID_1234&PID_ABCD\\SN0042' });

    expect(parsePnpMediaDevices(json)).toEqual([
      { vendorId: '1234', productId: 'abcd', name: 'Keys', manufacturer: null, serial: 'SN0042', usbLocation: null },
    ]);
  });

  it('GIVEN empty output or unusable entries WHEN parsed THEN no devices', () => {
    const json = JSON.stringify([
      null,
      'text',
      { FriendlyName: 'No instance' },
      { FriendlyName: 'Bluetooth', InstanceId: 'BTHENUM\\{0000}\\1' },
      { FriendlyName: ' ', InstanceId: 'USB\\VID_1234&PID_ABCD\\SN' },
    ]);

    expect(parsePnpMediaDevices('  ')).toEqual([]);
    expect(parsePnpMediaDevices(json)).toEqual([]);
  });
});
