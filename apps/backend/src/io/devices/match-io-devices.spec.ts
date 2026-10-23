import { describe, expect, it } from 'vitest';
import {
  IoDeviceKind,
  IoDeviceStatus,
  matchIoDevices,
  type AvailableIoDevice,
  type IoDeviceIdentity,
} from './match-io-devices';

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

function plugged(device: IoDeviceIdentity, handle: string, usbLocation = device.usbLocation): AvailableIoDevice {
  return { ...device, usbLocation, handle };
}

describe('matchIoDevices', () => {
  it('GIVEN a unique device WHEN plugged into another port THEN connected', () => {
    const result = matchIoDevices([ftdi], [plugged(ftdi, '/dev/ttyUSB1', '3-2')]);

    expect(result).toEqual([{ device: ftdi, status: IoDeviceStatus.Connected, handle: '/dev/ttyUSB1' }]);
  });

  it('GIVEN a configured device WHEN not plugged THEN missing', () => {
    const result = matchIoDevices([ftdi], [plugged(apc, 'APC 28:0')]);

    expect(result).toEqual([{ device: ftdi, status: IoDeviceStatus.Missing, handle: null }]);
  });

  it('GIVEN a different serial WHEN matched THEN missing', () => {
    const result = matchIoDevices([ftdi], [plugged({ ...ftdi, serial: 'OTHER' }, '/dev/ttyUSB0')]);

    expect(result[0]?.status).toBe(IoDeviceStatus.Missing);
  });

  it('GIVEN two identical devices listed in reverse order WHEN matched THEN each gets its own location', () => {
    const left = { ...apc, usbLocation: '3-1' };
    const right = { ...apc, usbLocation: '3-2' };

    const result = matchIoDevices([left, right], [plugged(apc, 'APC 32:0', '3-2'), plugged(apc, 'APC 28:0', '3-1')]);

    expect(result.map(match => match.handle)).toEqual(['APC 28:0', 'APC 32:0']);
  });

  it('GIVEN two identical devices WHEN one moved port THEN the other keeps its location and the moved one gets the rest', () => {
    const left = { ...apc, usbLocation: '3-1' };
    const right = { ...apc, usbLocation: '3-2' };

    const result = matchIoDevices([left, right], [plugged(apc, 'APC 28:0', '3-5'), plugged(apc, 'APC 32:0', '3-2')]);

    expect(result.map(match => [match.status, match.handle])).toEqual([
      [IoDeviceStatus.Connected, 'APC 28:0'],
      [IoDeviceStatus.Connected, 'APC 32:0'],
    ]);
  });

  it('GIVEN two identical devices WHEN both moved THEN ambiguous and none connected', () => {
    const left = { ...apc, usbLocation: '3-1' };
    const right = { ...apc, usbLocation: '3-2' };

    const result = matchIoDevices([left, right], [plugged(apc, 'APC 28:0', '3-7'), plugged(apc, 'APC 32:0', '3-8')]);

    expect(result.map(match => [match.status, match.handle])).toEqual([
      [IoDeviceStatus.Ambiguous, null],
      [IoDeviceStatus.Ambiguous, null],
    ]);
  });

  it('GIVEN one configured device WHEN two identical are plugged elsewhere THEN ambiguous', () => {
    const result = matchIoDevices([apc], [plugged(apc, 'APC 28:0', '3-7'), plugged(apc, 'APC 32:0', '3-8')]);

    expect(result[0]?.status).toBe(IoDeviceStatus.Ambiguous);
  });
});
