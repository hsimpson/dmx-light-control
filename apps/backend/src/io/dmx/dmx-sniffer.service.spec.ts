/// <reference types="vitest/globals" />
import { parseFrames } from './dmx-sniffer.service';
import { DmxSnifferService } from './dmx-sniffer.service';
import { vi } from 'vitest';

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
    const leftover = parseFrames(Buffer.concat([packet, packet, packet.subarray(0, 10)]), (h, d) => frames.push([h, d]));
    expect(frames).toHaveLength(2);
    expect(leftover.length).toBe(10);
  });

  it('returns the whole buffer when incomplete', () => {
    const buf = Buffer.alloc(10);
    const leftover = parseFrames(buf, () => undefined);
    expect(leftover.length).toBe(10);
  });
});

describe('DmxSnifferService', () => {
  it('startSniffer reads packets, reassembles a 513-byte frame and logs', async () => {
    const service = new DmxSnifferService();
    const logSpy = vi.spyOn(service['logger'], 'log').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logSpy2 = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    // Build one full DMX frame (513 bytes) preceded by a valid usbmon header
    const header = Buffer.alloc(48);
    header.writeUInt8(5, 11); // devnum = 5
    header.writeUInt8(2, 10); // epnum = 2
    header.writeUInt8(0x53, 8); // type 'S'
    header.writeUInt32LE(513, 36); // lenCap
    const frame = Buffer.alloc(513); // start code 0x00 + 512 zeros
    const packet = Buffer.concat([header, frame]);

    const fh = {
      read: vi.fn()
        .mockResolvedValueOnce({ bytesRead: packet.length, buffer: packet })
        .mockRejectedValueOnce(new Error('eof')),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const openSpy = vi.spyOn(require('node:fs/promises'), 'open').mockResolvedValue(fh as any);

    await service.startSniffer(1, 5);

    expect(logSpy2).toHaveBeenCalled();
    openSpy.mockRestore();
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('startSniffer catches and logs errors', async () => {
    const service = new DmxSnifferService();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(require('node:fs/promises'), 'open').mockRejectedValue(new Error('boom'));
    await service.startSniffer(1, 5);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
