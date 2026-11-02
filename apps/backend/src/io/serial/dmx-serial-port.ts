import { Logger } from '@nestjs/common';
import { SerialPort } from 'serialport';

/** DMX break must be ≥88µs; back-to-back termios ioctls are far shorter. */
const BREAK_DURATION_MS = 1;

/** One opened DMX USB UART (FTDI); frames are owned by the caller and shared across ports. */
export class DmxSerialPort {
  private readonly logger: Logger;
  private frameInFlight = false;
  private breakTimerId: NodeJS.Timeout | null = null;

  private constructor(
    private readonly port: SerialPort,
    public readonly path: string,
  ) {
    this.logger = new Logger(`${DmxSerialPort.name} ${path}`);
  }

  public static async open(path: string, onClosed: () => void): Promise<DmxSerialPort> {
    const port = new SerialPort({
      path,
      baudRate: 250000, // DMX512 absolute standard baud rate
      dataBits: 8,
      stopBits: 2, // DMX standard requires 2 stop bits
      parity: 'none',
      autoOpen: false,
    });
    await new Promise<void>((resolve, reject) => {
      port.open(err => {
        if (err) reject(err);
        else resolve();
      });
    });

    const dmxPort = new DmxSerialPort(port, path);
    port.on('error', (err: Error) => {
      dmxPort.logger.error(`Serial Port Error: ${err.message}`);
      dmxPort.close();
    });
    port.on('close', () => {
      dmxPort.cancelBreakTimer();
      onClosed();
    });
    return dmxPort;
  }

  /**
   * Orchestrates the strict DMX framing sequence: BREAK -> MAB -> DATA
   */
  public sendFrame(frame: Uint8Array): void {
    if (!this.port.isOpen || this.frameInFlight) return;

    this.frameInFlight = true;

    // 1. Drop the line into a BREAK state (pull low) for at least 88µs
    this.port.set({ brk: true }, err => {
      if (err) {
        this.frameInFlight = false;
        return;
      }

      this.breakTimerId = setTimeout(() => {
        this.breakTimerId = null;
        if (!this.port.isOpen) {
          this.frameInFlight = false;
          return;
        }

        this.port.set({ brk: false }, err1 => {
          this.flushFrame(frame, err1);
        });
      }, BREAK_DURATION_MS);
    });
  }

  public close(): void {
    this.cancelBreakTimer();
    if (this.port.isOpen) {
      this.port.close(err => {
        if (err) this.logger.error(`Error cleanly closing serial port: ${err.message}`);
      });
    }
  }

  /**
   * Writes the DMX buffer to the serial port after the BREAK/MAB sequence.
   * Skipped when the break-release `set()` reported an error.
   */
  private flushFrame(frame: Uint8Array, err1: Error | null): void {
    if (err1) {
      this.frameInFlight = false;
      this.logger.error(`Error releasing BREAK state: ${err1.message}`);
      return;
    }

    this.port.write(Buffer.from(frame), err2 => {
      this.frameInFlight = false;
      if (err2) {
        this.logger.error(`Error flushing payload: ${err2.message}`);
      }
    });
  }

  private cancelBreakTimer(): void {
    if (this.breakTimerId) {
      clearTimeout(this.breakTimerId);
      this.breakTimerId = null;
    }
    this.frameInFlight = false;
  }
}
