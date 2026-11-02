import { normalizeUsbId, type UsbIdentity } from '../usb-identity';

export const PNP_MEDIA_ARGS = [
  '-NoProfile',
  '-NonInteractive',
  '-Command',
  "Get-PnpDevice -Class MEDIA -PresentOnly | Where-Object InstanceId -like 'USB\\*' | Select-Object FriendlyName,Manufacturer,InstanceId | ConvertTo-Json -Compress",
];

// e.g. USB\VID_09E8&PID_004F&MI_00\7&2A3B4C5D&0&0000
const INSTANCE_ID = /^USB\\VID_([0-9A-F]{4})&PID_([0-9A-F]{4})[^\\]*\\(.+)$/i;

export function parsePnpMediaDevices(json: string): UsbIdentity[] {
  if (!json.trim()) return [];
  const parsed: unknown = JSON.parse(json);
  const entries: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
  return entries.flatMap(entry => {
    const name = field(entry, 'FriendlyName');
    const match = INSTANCE_ID.exec(field(entry, 'InstanceId') ?? '');
    const [, vendorId, productId, instance] = match ?? [];
    if (!name || !instance) return [];
    // Windows derives the instance id from the USB port when the device has no serial number.
    const portDerived = instance.includes('&');
    return [
      {
        vendorId: normalizeUsbId(vendorId),
        productId: normalizeUsbId(productId),
        name,
        manufacturer: field(entry, 'Manufacturer'),
        serial: portDerived ? null : instance,
        usbLocation: portDerived ? instance : null,
      },
    ];
  });
}

function field(entry: unknown, key: string): string | null {
  if (typeof entry !== 'object' || entry === null) return null;
  const value: unknown = Reflect.get(entry, key);
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
