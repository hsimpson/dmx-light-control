import type { UsbIdentity } from '../usb-identity';

export const DEVICE_INQUIRY: readonly number[] = [0xf0, 0x7e, 0x7f, 0x06, 0x01, 0xf7];

const REPLY_LENGTH = 35;
const REPLY_HEADER = [0x06, 0x02, 0x47, 0x4f, 0x00, 0x19];
const REPLY_HEADER_OFFSET = 3;
// Akai documents bytes 14-17 as the serial, but they are zero; the sticker number sits in the "manufacturing data".
const SERIAL_START = 20;
const SERIAL_END = 34;
const SERIAL_PATTERN = /^\d{14}$/;

export function isApcMiniMk2({ vendorId, productId }: Pick<UsbIdentity, 'vendorId' | 'productId'>): boolean {
  return vendorId === '09e8' && productId === '004f';
}

export function parseApcMiniMk2Serial(message: readonly number[]): string | null {
  const isInquiryReply =
    message.length === REPLY_LENGTH &&
    message[0] === 0xf0 &&
    message[1] === 0x7e &&
    message[REPLY_LENGTH - 1] === 0xf7 &&
    REPLY_HEADER.every((byte, index) => message[REPLY_HEADER_OFFSET + index] === byte);
  if (!isInquiryReply) {
    return null;
  }
  const serial = String.fromCharCode(...message.slice(SERIAL_START, SERIAL_END));
  return SERIAL_PATTERN.test(serial) ? serial : null;
}
