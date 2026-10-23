import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { UpdateProjectIoDevicesInput } from './update-project-io-devices.dto';

const PROJECT_PUBLIC_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const ftdi = {
  kind: 'DmxSerial',
  name: 'FT232R USB UART',
  manufacturer: 'FTDI',
  serial: 'A50285BI',
  vendorId: '0403',
  productId: '6001',
  usbLocation: '3-10',
};

async function errorsFor(ioDevices: unknown[], publicId = PROJECT_PUBLIC_ID): Promise<string> {
  const errors = await validate(plainToInstance(UpdateProjectIoDevicesInput, { publicId, ioDevices }));
  return JSON.stringify(errors);
}

describe('UpdateProjectIoDevicesInput', () => {
  it.each([
    ['a complete device', ftdi],
    ['a Windows instance location', { ...ftdi, usbLocation: '7&2A3B4C5D&0&0000' }],
    ['a macOS hex location', { ...ftdi, usbLocation: '14100000' }],
    ['null optional fields', { kind: 'Midi', name: 'Keys', manufacturer: null, serial: null, vendorId: null }],
  ])('GIVEN %s WHEN validated THEN valid', async (_case, device) => {
    await expect(errorsFor([device])).resolves.toBe('[]');
  });

  it.each([
    ['an unknown kind', { ...ftdi, kind: 'Usb' }, 'kind'],
    ['an uppercase vendor id', { ...ftdi, vendorId: '0A03' }, 'vendorId'],
    ['a 5-digit product id', { ...ftdi, productId: '60011' }, 'productId'],
    ['a usbLocation with path characters', { ...ftdi, usbLocation: '../../etc' }, 'usbLocation'],
    ['an overlong usbLocation', { ...ftdi, usbLocation: 'a'.repeat(65) }, 'usbLocation'],
    ['an empty name', { ...ftdi, name: '' }, 'name'],
    ['an overlong serial', { ...ftdi, serial: 'x'.repeat(256) }, 'serial'],
    ['a non-string manufacturer', { ...ftdi, manufacturer: 42 }, 'manufacturer'],
  ])('GIVEN %s WHEN validated THEN rejects %s', async (_case, device, property) => {
    await expect(errorsFor([device])).resolves.toContain(`"property":"${property}"`);
  });

  it('GIVEN more than 32 devices WHEN validated THEN rejects the list', async () => {
    await expect(errorsFor(Array.from({ length: 33 }, () => ftdi))).resolves.toContain('arrayMaxSize');
  });

  it('GIVEN a non-UUID project id WHEN validated THEN rejects publicId', async () => {
    await expect(errorsFor([ftdi], 'not-a-uuid')).resolves.toContain('"property":"publicId"');
  });
});
