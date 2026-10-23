export type UsbIdentity = {
  vendorId: string | null;
  productId: string | null;
  name: string;
  manufacturer: string | null;
  serial: string | null;
  usbLocation: string | null;
};

export function normalizeUsbId(value: string | undefined | null): string | null {
  const normalized = value?.trim().toLowerCase().replace(/^0x/, '');
  return normalized ? normalized.padStart(4, '0') : null;
}
