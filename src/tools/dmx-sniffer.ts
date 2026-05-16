import fs from 'node:fs/promises';

const BUS_NUMBER = 3;
const TARGET_DEVICE = 8;
const TARGET_ENDPOINT = 2;

// usbmon binary packet header is 48 bytes when reading from /dev/usbmonN via read().
// The 64-byte extended header requires the MON_IOCX_GETX ioctl instead.
const USBMON_HEADER_SIZE = 48;

// Offsets within the usbmon_packet header
const OFFSET_TYPE = 8; // u8: 'S'=submit, 'C'=complete, 'E'=error
const OFFSET_XFER_TYPE = 9; // u8: 0=ISO, 1=Intr, 2=Control, 3=Bulk
const OFFSET_EPNUM = 10; // u8: endpoint number (bit 7 = direction)
const OFFSET_DEVNUM = 11; // u8: device address
const OFFSET_STATUS = 28; // i32: URB status
const OFFSET_LENGTH = 32; // u32: requested data length
const OFFSET_LEN_CAP = 36; // u32: captured data bytes appended after header

function parseFrames(buf: Buffer, onFrame: (header: Buffer, data: Buffer) => void): Buffer {
  let offset = 0;
  while (offset + USBMON_HEADER_SIZE <= buf.length) {
    const lenCap = buf.readUInt32LE(offset + OFFSET_LEN_CAP);
    const frameSize = USBMON_HEADER_SIZE + lenCap;
    if (offset + frameSize > buf.length) break; // incomplete frame, wait for more data
    const header = buf.subarray(offset, offset + USBMON_HEADER_SIZE);
    const data = buf.subarray(offset + USBMON_HEADER_SIZE, offset + frameSize);
    onFrame(header, data);
    offset += frameSize;
  }
  return buf.subarray(offset); // return any leftover incomplete bytes
}

const devicePath = `/dev/usbmon${BUS_NUMBER}`;
console.log(`🚀 Starting DMX Sniffer on ${devicePath}...`);

async function main() {
  let fh: fs.FileHandle | undefined;
  try {
    fh = await fs.open(devicePath, 'r');
    let pending: Buffer = Buffer.alloc(0);
    const readBuf = Buffer.allocUnsafe(4096);
    let dmxBuffer: Buffer = Buffer.alloc(0);

    // Character devices like usbmon return one packet per read() syscall.
    // Using a manual loop avoids createReadStream treating a blocking read as EOF.
    console.log('⏳ Waiting for USB packets...');

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      const { bytesRead } = await fh.read(readBuf, 0, readBuf.length, null);
      if (bytesRead === 0) continue;

      pending = Buffer.concat([pending, readBuf.subarray(0, bytesRead)]);
      pending = parseFrames(pending, (header, data) => {
        const devnum = header.readUInt8(OFFSET_DEVNUM);
        const epnum = header.readUInt8(OFFSET_EPNUM);
        const endpoint = epnum & 0x0f;
        // const direction = epnum & 0x80 ? 'IN' : 'OUT';
        const type = String.fromCharCode(header.readUInt8(OFFSET_TYPE));

        if (devnum !== TARGET_DEVICE || endpoint !== TARGET_ENDPOINT || type !== 'S') return;
        if (data.length === 0) return;

        // FTDI serial driver splits writes into multiple USB packets — accumulate and reassemble.
        dmxBuffer = Buffer.concat([dmxBuffer, data]);

        // Align: skip any leading bytes until we find the DMX start code (0x00)
        while (dmxBuffer.length > 0 && dmxBuffer[0] !== 0x00) {
          dmxBuffer = dmxBuffer.subarray(1);
        }

        if (dmxBuffer.length >= 513) {
          const frame = dmxBuffer.subarray(0, 513);
          dmxBuffer = dmxBuffer.subarray(513);

          let message = '';
          message += `Ch 001-064: ${[...frame.subarray(1, 65)].map(b => b.toString(16).padStart(2, '0')).join(' ')}\n`;
          message += `Ch 065-128: ${[...frame.subarray(65, 129)].map(b => b.toString(16).padStart(2, '0')).join(' ')}\n`;
          message += `Ch 129-192: ${[...frame.subarray(129, 193)].map(b => b.toString(16).padStart(2, '0')).join(' ')}\n`;
          message += `Ch 193-256: ${[...frame.subarray(193, 257)].map(b => b.toString(16).padStart(2, '0')).join(' ')}\n`;
          message += `Ch 257-320: ${[...frame.subarray(257, 321)].map(b => b.toString(16).padStart(2, '0')).join(' ')}\n`;
          message += `Ch 321-384: ${[...frame.subarray(321, 385)].map(b => b.toString(16).padStart(2, '0')).join(' ')}\n`;
          message += `Ch 385-448: ${[...frame.subarray(385, 449)].map(b => b.toString(16).padStart(2, '0')).join(' ')}\n`;
          message += `Ch 449-512: ${[...frame.subarray(449, 513)].map(b => b.toString(16).padStart(2, '0')).join(' ')}\n`;
          message += '\n';

          console.log(message);
        }
      });
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error(`❌ Error: ${e.message}`);
    } else {
      console.error('❌ An unknown error occurred.');
    }
  } finally {
    await fh?.close();
  }
}

await main();
