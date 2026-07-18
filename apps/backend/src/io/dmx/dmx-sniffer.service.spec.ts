/// <reference types="vitest/globals" />
import { vi } from 'vitest';
import { DmxSnifferService, parseFrames } from './dmx-sniffer.service';

describe('parseFrames', () => {
  it('splits concatenated usbmon packets and returns leftover', () => {
    const header = Buffer.alloc(48);
    header.writeUInt8(1, 11); // devnum
    header.writeUInt8(2, 10); // epnum
    header.writeUInt8(0x53, 8); // type 'S'
    header.writeUInt32LE(4, 36); // lenCap
    const data = Buffer.from([0, 1, 2, 3]);
    const packet = Buffer.concat([header, data]);
    const frames: Array<[Buffer, Buffer]> = [];
    const leftover = parseFrames(Buffer.concat([packet, packet, packet.subarray(0, 10)]), (h, d) =>
      frames.push([h, d]),
    );
    expect(frames).toHaveLength(2);
    expect(leftover.length).toBe(10);
  });

  it('returns the whole buffer when incomplete', () => {
    const buf = Buffer.alloc(10);
    const leftover = parseFrames(buf, () => undefined);
    expect(leftover.length).toBe(10);
  });

  it('breaks out of the loop on a truncated frame mid-buffer', () => {
    const header = Buffer.alloc(48);
    header.writeUInt8(1, 11);
    header.writeUInt8(2, 10);
    header.writeUInt8(0x53, 8);
    header.writeUInt32LE(4, 36); // claims 4 data bytes
    const data = Buffer.from([0, 1, 2, 3]);
    const goodPacket = Buffer.concat([header, data]);
    // Second header claims far more data than is present -> truncated mid-buffer
    const truncatedHeader = Buffer.alloc(48);
    truncatedHeader.writeUInt8(1, 11);
    truncatedHeader.writeUInt8(2, 10);
    truncatedHeader.writeUInt8(0x53, 8);
    truncatedHeader.writeUInt32LE(1000, 36);
    const buf = Buffer.concat([goodPacket, truncatedHeader]);
    const frames: Array<[Buffer, Buffer]> = [];
    const leftover = parseFrames(buf, (h, d) => frames.push([h, d]));
    expect(frames).toHaveLength(1);
    expect(leftover.length).toBe(truncatedHeader.length);
  });
});

describe('DmxSnifferService', () => {
  it('startSniffer reads packets, reassembles a 513-byte frame and logs', async () => {
    const service = new DmxSnifferService();
    const logSpy = vi.spyOn(service['logger'], 'log').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logged: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => {
      logged.push(a.map(String).join(' '));
    });

    // Build one full DMX frame (513 bytes) preceded by a valid usbmon header
    const header = Buffer.alloc(48);
    header.writeUInt8(5, 11); // devnum = 5
    header.writeUInt8(2, 10); // epnum = 2
    header.writeUInt8(0x53, 8); // type 'S'
    header.writeUInt32LE(513, 36); // lenCap
    const frame = Buffer.alloc(513); // start code 0x00 + 512 zeros
    const packet = Buffer.concat([header, frame]);

    // The source reads into its own readBuf and ignores the returned `buffer`,
    // so the mock must copy the packet into the provided buffer.
    const fh = {
      read: vi
        .fn()
        .mockImplementationOnce((buf: Buffer) => {
          packet.copy(buf, 0);
          return Promise.resolve({ bytesRead: packet.length, buffer: buf });
        })
        .mockRejectedValueOnce(new Error('eof')),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const openSpy = vi.spyOn(require('node:fs/promises'), 'open').mockResolvedValue(fh as any);

    await service.startSniffer(1, 5);

    expect(logged.some(line => line.includes('Ch 001-064'))).toBe(true);
    openSpy.mockRestore();
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('startSniffer catches and logs Error instances', async () => {
    const service = new DmxSnifferService();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(require('node:fs/promises'), 'open').mockRejectedValue(new Error('boom'));
    await service.startSniffer(1, 5);
    expect(errorSpy).toHaveBeenCalledWith('❌ Error: boom');
    errorSpy.mockRestore();
  });

  it('startSniffer catches and logs unknown (non-Error) errors', async () => {
    const service = new DmxSnifferService();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(require('node:fs/promises'), 'open').mockRejectedValue('boom');
    await service.startSniffer(1, 5);
    expect(errorSpy).toHaveBeenCalledWith('❌ An unknown error occurred.');
    errorSpy.mockRestore();
  });

  it('startSniffer ignores packets that do not target the requested device/endpoint/type', async () => {
    const service = new DmxSnifferService();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logged: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => {
      logged.push(a.map(String).join(' '));
    });

    const header = Buffer.alloc(48);
    header.writeUInt8(9, 11); // devnum != 5 -> ignored
    header.writeUInt8(2, 10);
    header.writeUInt8(0x53, 8);
    header.writeUInt32LE(4, 36);
    const packet = Buffer.concat([header, Buffer.from([0, 1, 2, 3])]);

    const fh = {
      read: vi.fn().mockRejectedValueOnce(new Error('eof')),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const openSpy = vi.spyOn(require('node:fs/promises'), 'open').mockResolvedValue(fh as any);

    await service.startSniffer(1, 5);

    expect(logged.some(line => line.includes('Ch 001-064'))).toBe(false);
    openSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('startSniffer ignores matching packets with zero-length data', async () => {
    const service = new DmxSnifferService();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logged: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => {
      logged.push(a.map(String).join(' '));
    });

    const header = Buffer.alloc(48);
    header.writeUInt8(5, 11); // devnum = 5
    header.writeUInt8(2, 10); // epnum = 2
    header.writeUInt8(0x53, 8); // type 'S'
    header.writeUInt32LE(0, 36); // lenCap = 0 -> no data
    const packet = Buffer.from(header); // 48-byte header only

    const fh = {
      read: vi
        .fn()
        .mockImplementationOnce((buf: Buffer) => {
          packet.copy(buf, 0);
          return Promise.resolve({ bytesRead: packet.length, buffer: buf });
        })
        .mockRejectedValueOnce(new Error('eof')),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const openSpy = vi.spyOn(require('node:fs/promises'), 'open').mockResolvedValue(fh as any);

    await service.startSniffer(1, 5);

    expect(logged.some(line => line.includes('Ch 001-064'))).toBe(false);
    openSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('startSniffer ignores packets whose type is not submit (S)', async () => {
    const service = new DmxSnifferService();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logged: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => {
      logged.push(a.map(String).join(' '));
    });

    // devnum and endpoint match, but type is 'C' (complete) instead of 'S'.
    const header = Buffer.alloc(48);
    header.writeUInt8(5, 11); // devnum = 5
    header.writeUInt8(2, 10); // epnum = 2
    header.writeUInt8(0x43, 8); // type 'C' (not 'S')
    header.writeUInt32LE(513, 36); // lenCap = 513
    const frame = Buffer.alloc(513);
    const packet = Buffer.concat([header, frame]);

    const fh = {
      read: vi
        .fn()
        .mockImplementationOnce((buf: Buffer) => {
          packet.copy(buf, 0);
          return Promise.resolve({ bytesRead: packet.length, buffer: buf });
        })
        .mockRejectedValueOnce(new Error('eof')),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const openSpy = vi.spyOn(require('node:fs/promises'), 'open').mockResolvedValue(fh as any);

    await service.startSniffer(1, 5);

    expect(logged.some(line => line.includes('Ch 001-064'))).toBe(false);
    openSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('startSniffer skips leading non-start-code bytes before reassembling', async () => {
    const service = new DmxSnifferService();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logged: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => {
      logged.push(a.map(String).join(' '));
    });

    // First packet carries garbage (no 0x00 start code) for the matching device.
    const garbageHeader = Buffer.alloc(48);
    garbageHeader.writeUInt8(5, 11);
    garbageHeader.writeUInt8(2, 10);
    garbageHeader.writeUInt8(0x53, 8);
    garbageHeader.writeUInt32LE(4, 36);
    const garbagePacket = Buffer.concat([garbageHeader, Buffer.from([0xaa, 0xbb, 0xcc, 0xdd])]);

    // Second packet carries the real 513-byte frame (starts with 0x00).
    const frameHeader = Buffer.alloc(48);
    frameHeader.writeUInt8(5, 11);
    frameHeader.writeUInt8(2, 10);
    frameHeader.writeUInt8(0x53, 8);
    frameHeader.writeUInt32LE(513, 36);
    const frame = Buffer.alloc(513);
    const framePacket = Buffer.concat([frameHeader, frame]);

    const fh = {
      read: vi
        .fn()
        .mockImplementationOnce((buf: Buffer) => {
          garbagePacket.copy(buf, 0);
          return Promise.resolve({ bytesRead: garbagePacket.length, buffer: buf });
        })
        .mockImplementationOnce((buf: Buffer) => {
          framePacket.copy(buf, 0);
          return Promise.resolve({ bytesRead: framePacket.length, buffer: buf });
        })
        .mockRejectedValueOnce(new Error('eof')),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const openSpy = vi.spyOn(require('node:fs/promises'), 'open').mockResolvedValue(fh as any);

    await service.startSniffer(1, 5);

    expect(logged.some(line => line.includes('Ch 001-064'))).toBe(true);
    openSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('startSniffer continues after a zero-byte read', async () => {
    const service = new DmxSnifferService();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logged: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => {
      logged.push(a.map(String).join(' '));
    });

    const header = Buffer.alloc(48);
    header.writeUInt8(5, 11);
    header.writeUInt8(2, 10);
    header.writeUInt8(0x53, 8);
    header.writeUInt32LE(513, 36);
    const frame = Buffer.alloc(513);
    const packet = Buffer.concat([header, frame]);

    const fh = {
      read: vi
        .fn()
        .mockImplementationOnce((_buf: Buffer) => Promise.resolve({ bytesRead: 0, buffer: _buf }))
        .mockImplementationOnce((buf: Buffer) => {
          packet.copy(buf, 0);
          return Promise.resolve({ bytesRead: packet.length, buffer: buf });
        })
        .mockRejectedValueOnce(new Error('eof')),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const openSpy = vi.spyOn(require('node:fs/promises'), 'open').mockResolvedValue(fh as any);

    await service.startSniffer(1, 5);

    expect(logged.some(line => line.includes('Ch 001-064'))).toBe(true);
    openSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
