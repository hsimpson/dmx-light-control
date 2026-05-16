import { SerialPort } from 'serialport';

const port = new SerialPort({
  path: '/dev/ttyUSB0',
  baudRate: 250000,
  dataBits: 8,
  stopBits: 2, // DMX512 requires 2 stop bits
  parity: 'none',
});

// DMX frame: start byte 0x00 + 512 channel values
const dmxFrame = Buffer.alloc(513, 0);
dmxFrame[0] = 0; // DMX start code
dmxFrame[1] = 255; // channel 1 = full
dmxFrame[2] = 128; // channel 2 = half

function sendDmxFrame(): void {
  // DMX512 requires a BREAK (~88 µs min) before each frame
  port.set({ brk: true }, err1 => {
    if (err1) {
      console.error('brk=true error:', err1.message);
      return;
    }
    console.log('BREAK set');
    setTimeout(() => {
      // MAB (Mark After Break, ~8 µs min) — release the line
      port.set({ brk: false }, err2 => {
        if (err2) {
          console.error('brk=false error:', err2.message);
          return;
        }
        console.log('MAB set');
        setTimeout(() => {
          port.write(dmxFrame, err3 => {
            if (err3) {
              console.error('write error:', err3.message);
              return;
            }
            console.log('frame written');
          });
          port.drain();
        }, 1); // MAB: 1 ms (well above the 8 µs minimum)
      });
    }, 1); // BREAK: 1 ms (well above the 88 µs minimum)
  });
}

port.on('open', () => {
  setInterval(sendDmxFrame, 33); // ~30 Hz refresh rate (max)
});

port.on('error', (err: Error) => {
  console.error(`Serial port error: ${err.message}`);
});
