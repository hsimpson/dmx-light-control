import fs from 'node:fs/promises';
import { describe, it, vi, type Mock } from 'vitest';
import { DmxSnifferService } from './dmx-sniffer.service';

type ReadResult = { bytesRead: number; buffer: Buffer };
type ReadMock = Mock<(buf: Buffer) => Promise<ReadResult>>;

function makeFh(packet: Buffer): fs.FileHandle {
  const read: ReadMock = vi
    .fn<(buf: Buffer) => Promise<ReadResult>>()
    .mockImplementationOnce(async (buf: Buffer) => {
      packet.copy(buf, 0);
      return Promise.resolve({ bytesRead: packet.length, buffer: buf });
    })
    .mockRejectedValueOnce(new Error('eof'));
  return {
    read,
    close: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  } as unknown as fs.FileHandle;
}

describe('dbg', () => {
  it('test1 logs frame', async () => {
    const service = new DmxSnifferService();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const header = Buffer.alloc(48);
    header.writeUInt8(5, 11);
    header.writeUInt8(2, 10);
    header.writeUInt8(0x53, 8);
    header.writeUInt32LE(513, 36);
    const packet = Buffer.concat([header, Buffer.alloc(513)]);
    const fh = makeFh(packet);
    const openSpy = vi.spyOn(fs, 'open').mockResolvedValue(fh);
    await service.startSniffer(1, 5);
    openSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('test2 error', async () => {
    const service = new DmxSnifferService();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(fs, 'open').mockRejectedValue(new Error('boom'));
    await service.startSniffer(1, 5);
    process.stdout.write('[T2 done]\n');
    errorSpy.mockRestore();
  });

  it('test3 unknown error', async () => {
    const service = new DmxSnifferService();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(fs, 'open').mockRejectedValue('boom');
    await service.startSniffer(1, 5);
    process.stdout.write('[T3 done]\n');
    errorSpy.mockRestore();
  });

  it('test4 ignores non-target', async () => {
    const service = new DmxSnifferService();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const header = Buffer.alloc(48);
    header.writeUInt8(9, 11);
    header.writeUInt8(2, 10);
    header.writeUInt8(0x53, 8);
    header.writeUInt32LE(4, 36);
    const packet = Buffer.concat([header, Buffer.from([0, 1, 2, 3])]);
    const fh = makeFh(packet);
    const openSpy = vi.spyOn(fs, 'open').mockResolvedValue(fh);
    await service.startSniffer(1, 5);
    openSpy.mockRestore();
    logSpy.mockRestore();
  });
});
