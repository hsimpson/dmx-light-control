import { describe, expect, it } from 'vitest';
import { parseIoregUsbDevices } from './macos-ioreg';

function device(entries: string): string {
  return `<dict>${entries}<key>IORegistryEntryChildren</key><array/></dict>`;
}

function ioreg(...devices: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><array>${devices.join('')}</array></plist>`;
}

const apc = (locationId: number): string =>
  device(`
    <key>USB Product Name</key><string>APC mini mk2</string>
    <key>USB Vendor Name</key><string>AKAI professional</string>
    <key>USB Serial Number</key><string>Ver00.10</string>
    <key>idVendor</key><integer>2536</integer>
    <key>idProduct</key><integer>79</integer>
    <key>locationID</key><integer>${locationId}</integer>`);

describe('parseIoregUsbDevices', () => {
  it('GIVEN ioreg plist output WHEN parsed THEN returns one identity per USB device with hex ids and location', () => {
    expect(parseIoregUsbDevices(ioreg(apc(336592896), apc(336658432)))).toEqual([
      {
        vendorId: '09e8',
        productId: '004f',
        name: 'APC mini mk2',
        manufacturer: 'AKAI professional',
        serial: 'Ver00.10',
        usbLocation: '14100000',
      },
      expect.objectContaining({ name: 'APC mini mk2', usbLocation: '14110000' }),
    ]);
  });

  it('GIVEN devices without product name or location WHEN parsed THEN skipped', () => {
    const noName = device('<key>locationID</key><integer>1</integer>');
    const noLocation = device('<key>USB Product Name</key><string>Hub</string>');

    expect(parseIoregUsbDevices(ioreg(noName, noLocation))).toEqual([]);
  });

  it('GIVEN a device without optional fields WHEN parsed THEN they are null', () => {
    const minimal = device(
      '<key>USB Product Name</key><string> Keys </string><key>locationID</key><integer>255</integer><key>USB Serial Number</key><string> </string>',
    );

    expect(parseIoregUsbDevices(ioreg(minimal))).toEqual([
      { vendorId: null, productId: null, name: 'Keys', manufacturer: null, serial: null, usbLocation: 'ff' },
    ]);
  });

  it('GIVEN a single dictionary root or non-dictionary entries WHEN parsed THEN handled', () => {
    const single = `<?xml version="1.0"?><plist version="1.0">${apc(1)}</plist>`;
    const mixed = ioreg('<string>noise</string>', '<array/>', '<date>2026-01-01T00:00:00Z</date>', '<data>AA==</data>');

    expect(parseIoregUsbDevices(single)).toHaveLength(1);
    expect(parseIoregUsbDevices(mixed)).toEqual([]);
  });
});
