import { describe, expect, it } from 'vitest';
import { isApcMiniMk2, parseApcMiniMk2Serial } from './apc-mini-mk2';

const replyWithSerial = (serial: readonly number[]) => [
  0xf0,
  0x7e,
  0x00,
  0x06,
  0x02,
  0x47,
  0x4f,
  0x00,
  0x19,
  0x02,
  0x30,
  0x00,
  0x00,
  0x7f,
  0x00,
  0x00,
  0x00,
  0x00,
  0x0a,
  0x04,
  ...serial,
  0xf7,
];

const FIRST_UNIT = [0x32, 0x35, 0x30, 0x38, 0x32, 0x35, 0x36, 0x30, 0x37, 0x30, 0x39, 0x38, 0x31, 0x30];
const SECOND_UNIT = [0x32, 0x36, 0x30, 0x36, 0x32, 0x35, 0x36, 0x30, 0x38, 0x37, 0x38, 0x37, 0x35, 0x30];

describe('parseApcMiniMk2Serial', () => {
  it.each([
    ['first unit', FIRST_UNIT, '25082560709810'],
    ['second unit', SECOND_UNIT, '26062560878750'],
  ])('GIVEN the reply captured from the %s WHEN parsed THEN returns its serial', (_unit, serial, expected) => {
    expect(parseApcMiniMk2Serial(replyWithSerial(serial))).toBe(expected);
  });

  it('GIVEN a reply from another product WHEN parsed THEN returns null', () => {
    const reply = replyWithSerial(FIRST_UNIT);
    reply[6] = 0x29;

    expect(parseApcMiniMk2Serial(reply)).toBeNull();
  });

  it('GIVEN a truncated reply WHEN parsed THEN returns null', () => {
    expect(parseApcMiniMk2Serial(replyWithSerial(FIRST_UNIT).slice(0, 34))).toBeNull();
  });

  it('GIVEN a reply without terminator WHEN parsed THEN returns null', () => {
    const reply = replyWithSerial(FIRST_UNIT);
    reply[34] = 0x00;

    expect(parseApcMiniMk2Serial(reply)).toBeNull();
  });

  it('GIVEN non-digit bytes in the serial field WHEN parsed THEN returns null', () => {
    expect(parseApcMiniMk2Serial(replyWithSerial([...FIRST_UNIT.slice(0, 13), 0x41]))).toBeNull();
  });

  it('GIVEN a fader message WHEN parsed THEN returns null', () => {
    expect(parseApcMiniMk2Serial([0xb0, 0x30, 0x7f])).toBeNull();
  });
});

describe('isApcMiniMk2', () => {
  it('GIVEN the APC mini mk2 USB ids WHEN checked THEN returns true', () => {
    expect(isApcMiniMk2({ vendorId: '09e8', productId: '004f' })).toBe(true);
  });

  it.each([
    [{ vendorId: '09e8', productId: '0028' }],
    [{ vendorId: '0403', productId: '004f' }],
    [{ vendorId: null, productId: null }],
  ])('GIVEN other USB ids %o WHEN checked THEN returns false', identity => {
    expect(isApcMiniMk2(identity)).toBe(false);
  });
});
