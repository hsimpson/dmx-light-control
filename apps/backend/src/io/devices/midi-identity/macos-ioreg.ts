import { parse, type PlistObject, type PlistValue } from 'plist';
import { normalizeUsbId, type UsbIdentity } from '../usb-identity';

/** `ioreg -a -r -d 1 -c IOUSBHostDevice` prints a plist array with one dictionary per USB device. */
export const IOREG_ARGS = ['-a', '-r', '-d', '1', '-c', 'IOUSBHostDevice'];

export function parseIoregUsbDevices(xml: string): UsbIdentity[] {
  const root = parse(xml);
  const entries = Array.isArray(root) ? root : [root];
  return entries.filter(isDict).flatMap(entry => {
    const name = text(entry['USB Product Name']);
    const locationId = entry.locationID;
    if (!name || typeof locationId !== 'number') return [];
    return [
      {
        vendorId: usbIdFromNumber(entry.idVendor),
        productId: usbIdFromNumber(entry.idProduct),
        name,
        manufacturer: text(entry['USB Vendor Name']),
        serial: text(entry['USB Serial Number']),
        usbLocation: locationId.toString(16),
      },
    ];
  });
}

function isDict(value: PlistValue): value is PlistObject {
  return typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && !Buffer.isBuffer(value);
}

function text(value: PlistValue | undefined): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function usbIdFromNumber(value: PlistValue | undefined): string | null {
  return typeof value === 'number' ? normalizeUsbId(value.toString(16)) : null;
}
