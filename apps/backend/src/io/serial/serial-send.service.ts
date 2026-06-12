import { AppEventEmitter } from '@/events/app-event-emitter';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SerialPort } from 'serialport';
import { DmxValue } from '../dmx/types/dmx.types'; // Adjust this path to your actual types location

@Injectable()
export class SerialSendService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SerialSendService.name);

  private port: SerialPort | null = null;
  private dmxFrame = new Uint8Array(513); // Index 0 = Start Code (0x00), 1-512 = Channels
  private isSending = false;
  private intervalId: NodeJS.Timeout | null = null;

  // Configuration constants
  private readonly REFRESH_RATE_MS = 33; // ~30 Hz refresh rate
  // FIXME: hardcoded for now, consider making this user-configurable or auto-detectable in the future
  private readonly SERIAL_PATH = '/dev/ttyUSB0'; // Default FTDI location on Ubuntu

  public constructor(private readonly eventEmitter: AppEventEmitter) {
    this.dmxFrame.fill(0); // Initialize everything to 0, including the start code at index 0

    // FIXME: hardcoded for ADJ Mega TriPar Profile Plus to set the shutter/strob channel 5 to 32 (full open) for testing
    this.dmxFrame[5] = 32;
    this.dmxFrame[14] = 32;
  }

  public onModuleInit(): void {
    this.initializeSerialPort();

    // Listen for incoming UI/API updates to channel values
    this.eventEmitter.on('dmx.channelValues', (values: DmxValue[]) => {
      this.setChannelValues(values);

      // Automatically kick off the loop if it isn't running and the port is healthy
      if (!this.isSending && this.port?.isOpen) {
        this.startSendingLoop();
      }
    });
  }

  public onModuleDestroy(): void {
    this.stopSendingLoop();
    this.closePort();
  }

  /**
   * Spawns the periodic interval to broadcast frames down the wire
   */
  public startSendingLoop(): void {
    if (this.isSending) return;

    this.isSending = true;
    this.logger.log(`🚀 Starting DMX frame broadcast stream (~${1000 / this.REFRESH_RATE_MS}Hz)`);

    this.intervalId = setInterval(() => {
      if (this.port?.isOpen && this.isSending) {
        this.sendDmxFrame();
      }
    }, this.REFRESH_RATE_MS);
  }

  /**
   * Stills the transmission loop
   */
  public stopSendingLoop(): void {
    this.isSending = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.logger.log('🛑 Stopped DMX frame broadcast stream.');
  }

  /**
   * Configures and opens the raw serial connection to the FTDI chip
   */
  private initializeSerialPort(): void {
    this.logger.log(`Connecting to FTDI DMX interface on ${this.SERIAL_PATH}...`);

    this.port = new SerialPort({
      path: this.SERIAL_PATH,
      baudRate: 250000, // DMX512 absolute standard baud rate
      dataBits: 8,
      stopBits: 2, // DMX standard requires 2 stop bits
      parity: 'none',
      autoOpen: false,
    });

    this.port.open(err => {
      if (err) {
        this.logger.error(`Failed to open serial port ${this.SERIAL_PATH}: ${err.message}`);
        this.logger.warn('💡 Ensure your user is in the "dialout" group: sudo usermod -aG dialout $USER');
        return;
      }

      this.logger.log(`Successfully claimed FTDI Serial Port on ${this.SERIAL_PATH}!`);
    });

    this.port.on('error', err => {
      this.logger.error(`Serial Port Error: ${err.message}`);
      this.stopSendingLoop();
    });
  }

  /**
   * Updates the local data frame buffer with incoming changes
   */
  private setChannelValues(channelValues: DmxValue[]): void {
    this.logger.debug(`Updating frame state: ${JSON.stringify(channelValues)}`);

    for (const { channel, value } of channelValues) {
      if (channel < 1 || channel > 512) {
        this.logger.warn(`Invalid DMX channel: ${channel}. Must be 1-512.`);
        continue;
      }
      if (value < 0 || value > 255) {
        this.logger.warn(`Invalid DMX value: ${value}. Must be 0-255.`);
        continue;
      }

      // DMX channels are 1-indexed, matching positions 1 to 512 in our buffer.
      // Index 0 remains locked at 0x00 (The DMX Start Code).
      this.dmxFrame[channel] = value;
    }
  }

  /**
   * Orchestrates the strict DMX framing sequence: BREAK -> MAB -> DATA
   */
  private sendDmxFrame(): void {
    if (!this.port?.isOpen) return;

    // 1. Drop the line into a BREAK state (pull low)
    this.port.set({ brk: true }, err => {
      if (err) return;

      // 2. Instantly lift the BREAK state (pull high)
      // The physical latency of executing these two commands back-to-back
      // at the system level typically yields an excellent ~100-200 microsecond break.
      this.port?.set({ brk: false }, err1 => {
        if (err1) return;

        // 3. Immediately dump the entire buffer
        this.port?.write(Buffer.from(this.dmxFrame.buffer), err2 => {
          if (err2) {
            this.logger.error(`Error flushing payload: ${err2.message}`);
          }
        });
      });
    });
  }

  private closePort(): void {
    if (this.port?.isOpen) {
      this.port.close(err => {
        if (err) this.logger.error(`Error cleanly closing serial port: ${err.message}`);
      });
    }
  }
}
