import { IoDeviceKind, IoDeviceStatus, type IoDeviceFieldsFragment } from '@/shared/types/graphql/graphql';
import { describe, expect, it } from 'vitest';
import { buildIoDeviceRows, toIoDeviceInput } from './project-io-devices';

const ftdi: IoDeviceFieldsFragment = {
  kind: IoDeviceKind.DmxSerial,
  name: 'FT232R USB UART',
  manufacturer: 'FTDI',
  serial: 'A50285BI',
  vendorId: '0403',
  productId: '6001',
  usbLocation: '3-10',
};

const apc: IoDeviceFieldsFragment = {
  kind: IoDeviceKind.Midi,
  name: 'APC mini mk2',
  manufacturer: 'AKAI professional',
  serial: 'Ver00.10',
  vendorId: '09e8',
  productId: '004f',
  usbLocation: '3-9',
};

describe('buildIoDeviceRows', () => {
  it('GIVEN configured and plugged-in devices WHEN built THEN configured first with status, then unused ones', () => {
    const rows = buildIoDeviceRows([ftdi], [ftdi, apc], [{ ...ftdi, status: IoDeviceStatus.Connected }]);

    expect(rows).toEqual([
      { key: 'configured-0', device: ftdi, configured: true, status: IoDeviceStatus.Connected },
      { key: 'available-0', device: apc, configured: false, status: null },
    ]);
  });

  it('GIVEN a configured device moved to another USB port WHEN built THEN it is not listed twice', () => {
    const rows = buildIoDeviceRows([ftdi], [{ ...ftdi, usbLocation: '3-2' }], []);

    expect(rows.map(row => row.key)).toEqual(['configured-0']);
  });

  it('GIVEN one configured and two identical devices plugged in WHEN built THEN the one on its port is claimed', () => {
    const left = { ...apc, usbLocation: '3-1' };
    const right = { ...apc, usbLocation: '3-2' };

    const rows = buildIoDeviceRows([right], [left, right], []);

    expect(rows.map(row => [row.configured, row.device.usbLocation])).toEqual([
      [true, '3-2'],
      [false, '3-1'],
    ]);
  });

  it('GIVEN a configured device without status yet WHEN built THEN status is null', () => {
    expect(buildIoDeviceRows([apc], [], [])[0]?.status).toBeNull();
  });
});

describe('toIoDeviceInput', () => {
  it('GIVEN a query result with __typename WHEN converted THEN only input fields remain', () => {
    const queried = { ...apc, __typename: 'IoDeviceDto' };

    expect(toIoDeviceInput(queried)).toEqual(apc);
  });
});
