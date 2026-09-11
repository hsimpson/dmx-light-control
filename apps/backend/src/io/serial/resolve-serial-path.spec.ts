import { describe, expect, it } from 'vitest';
import { resolveSerialPath, serialOpenHint } from './resolve-serial-path';

describe('resolveSerialPath', () => {
  it('uses a non-empty override even when the list disagrees', () => {
    const resolved = resolveSerialPath({
      override: ' /dev/missing-port ',
      platform: 'darwin',
      ports: [{ path: '/dev/cu.usbserial-A', vendorId: '0403', productId: '6001' }],
    });
    expect(resolved).toEqual({ path: '/dev/missing-port', source: 'override' });
  });

  it('ignores empty or whitespace-only override', () => {
    const resolved = resolveSerialPath({
      override: '   ',
      platform: 'linux',
      ports: [],
    });
    expect(resolved).toEqual({ path: '/dev/ttyUSB0', source: 'linux-default' });
  });

  it('picks the Darwin callout FT232R path by VID/PID', () => {
    const resolved = resolveSerialPath({
      platform: 'darwin',
      ports: [
        { path: '/dev/cu.Bluetooth-Incoming-Port' },
        { path: '/dev/cu.debug-console' },
        { path: '/dev/cu.usbserial-A50285BI', vendorId: '0403', productId: '6001' },
      ],
    });
    expect(resolved).toEqual({ path: '/dev/cu.usbserial-A50285BI', source: 'ftdi' });
  });

  it('rewrites Darwin tty. FT232R paths to cu.', () => {
    const resolved = resolveSerialPath({
      platform: 'darwin',
      ports: [{ path: '/dev/tty.usbserial-A50285BI', vendorId: '0x0403', productId: '6001' }],
    });
    expect(resolved).toEqual({ path: '/dev/cu.usbserial-A50285BI', source: 'ftdi' });
  });

  it('prefers the existing cu. sibling over a rewritten tty. twin', () => {
    const resolved = resolveSerialPath({
      platform: 'darwin',
      ports: [
        { path: '/dev/tty.usbserial-A', vendorId: '0403', productId: '6001' },
        { path: '/dev/cu.usbserial-A', vendorId: '0403', productId: '6001' },
      ],
    });
    expect(resolved).toEqual({ path: '/dev/cu.usbserial-A', source: 'ftdi' });
  });

  it('picks the lexicographically first of two FT232R callout paths', () => {
    const resolved = resolveSerialPath({
      platform: 'darwin',
      ports: [
        { path: '/dev/cu.usbserial-B', vendorId: '0403', productId: '6001' },
        { path: '/dev/cu.usbserial-A', vendorId: '0403', productId: '6001' },
      ],
    });
    expect(resolved?.path).toBe('/dev/cu.usbserial-A');
  });

  it('matches mixed-case and 0x-prefixed ids', () => {
    const resolved = resolveSerialPath({
      platform: 'linux',
      ports: [{ path: '/dev/ttyUSB1', vendorId: '0x0403', productId: '6001' }],
    });
    expect(resolved).toEqual({ path: '/dev/ttyUSB1', source: 'ftdi' });
  });

  it('falls back to Darwin name heuristic when VID/PID is missing', () => {
    const resolved = resolveSerialPath({
      platform: 'darwin',
      ports: [{ path: '/dev/cu.usbserial-XYZ' }, { path: '/dev/cu.FT232RUSBUART' }],
    });
    expect(resolved).toEqual({ path: '/dev/cu.FT232RUSBUART', source: 'name' });
  });

  it('falls back to Linux ttyUSB* name heuristic when VID/PID is missing', () => {
    const resolved = resolveSerialPath({
      platform: 'linux',
      ports: [{ path: '/dev/ttyUSB2' }],
    });
    expect(resolved).toEqual({ path: '/dev/ttyUSB2', source: 'name' });
  });

  it('uses the Linux default when nothing matches', () => {
    expect(resolveSerialPath({ platform: 'linux', ports: [] })).toEqual({
      path: '/dev/ttyUSB0',
      source: 'linux-default',
    });
  });

  it('returns null on Darwin when nothing matches', () => {
    expect(resolveSerialPath({ platform: 'darwin', ports: [] })).toBeNull();
  });

  it('does not treat ttyACM as this adapter', () => {
    expect(
      resolveSerialPath({
        platform: 'linux',
        ports: [{ path: '/dev/ttyACM0', vendorId: '2341', productId: '0043' }],
      }),
    ).toEqual({ path: '/dev/ttyUSB0', source: 'linux-default' });
  });
});

describe('serialOpenHint', () => {
  it('mentions dialout on linux', () => {
    expect(serialOpenHint('linux')).toContain('dialout');
  });

  it('mentions cu.usbserial on darwin', () => {
    expect(serialOpenHint('darwin')).toContain('/dev/cu.usbserial');
    expect(serialOpenHint('darwin')).not.toContain('dialout');
  });

  it('asks for DMX_SERIAL_PATH elsewhere', () => {
    expect(serialOpenHint('win32')).toContain('DMX_SERIAL_PATH');
  });
});
