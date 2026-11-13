import { describe, expect, it } from 'vitest';
import { listensToDevice } from './virtual-console-events';

describe('listensToDevice', () => {
  it.each([
    ['no scope', undefined, 'A'],
    ['a null scope', null, 'A'],
    ['an empty scope', [], 'A'],
    ['no scope and a device without serial', undefined, null],
    ['a scope containing the device', ['A', 'B'], 'B'],
  ])('GIVEN %s WHEN checked THEN the control listens', (_case, serials, deviceSerial) => {
    expect(listensToDevice(serials, deviceSerial)).toBe(true);
  });

  it.each([
    ['a scope without the device', ['A'], 'B'],
    ['a scope and a device without serial', ['A'], null],
  ])('GIVEN %s WHEN checked THEN the control does not listen', (_case, serials, deviceSerial) => {
    expect(listensToDevice(serials, deviceSerial)).toBe(false);
  });
});
