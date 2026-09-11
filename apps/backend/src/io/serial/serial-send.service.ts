import { AppEventEmitter } from '@/events/app-event-emitter';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SerialPort } from 'serialport';
import { DmxValue } from '../dmx/types/dmx.types';
import { ListedSerialPort, resolveSerialPath, serialOpenHint, type SerialPathSource } from './resolve-serial-path';

@Injectable()
export class SerialSendService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SerialSendService.name);

  private port: SerialPort | null = null;
  private dmxFrame = new Uint8Array(513); // Index 0 = Start Code (0x00), 1-512 = Channels
  private isSending = false;
  private frameInFlight = false;
  private intervalId: NodeJS.Timeout | null = null;
  private breakTimerId: NodeJS.Timeout | null = null;

  // Configuration constants
  private readonly REFRESH_RATE_MS = 33; // ~30 Hz refresh rate
  /** DMX break must be ≥88µs; back-to-back termios ioctls are far shorter. */
  private readonly BREAK_DURATION_MS = 1;

  public constructor(
    private readonly eventEmitter: AppEventEmitter,
    private readonly configService: ConfigService,
  ) {
    this.dmxFrame.fill(0); // Initialize everything to 0, including the start code at index 0
  }

  public async onModuleInit(): Promise<void> {
    await this.connectSerialPort();
    this.registerChannelListener();
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
    this.cancelBreakTimer();
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.logger.log('🛑 Stopped DMX frame broadcast stream.');
  }

  private registerChannelListener(): void {
    this.eventEmitter.on('dmx.channelValues', (values: DmxValue[]) => {
      this.setChannelValues(values);

      if (!this.isSending && this.port?.isOpen) {
        this.startSendingLoop();
      }
    });
  }

  private async connectSerialPort(): Promise<void> {
    let ports: ListedSerialPort[] = [];
    try {
      ports = await SerialPort.list();
    } catch (err) {
      this.logger.warn(`SerialPort.list() failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    const resolved = resolveSerialPath({
      override: this.configService.get<string>('serialPath'),
      platform: process.platform,
      ports,
    });

    if (!resolved) {
      this.logger.error('No FTDI DMX serial adapter found. Plug in the USB2DMX adapter or set DMX_SERIAL_PATH.');
      this.logger.warn(serialOpenHint(process.platform));
      return;
    }

    this.initializeSerialPort(resolved.path, resolved.source);
  }

  /**
   * Configures and opens the raw serial connection to the FTDI chip
   */
  private initializeSerialPort(path: string, source: SerialPathSource): void {
    this.logger.log(`Connecting to FTDI DMX interface on ${path} (${source})...`);

    this.port = new SerialPort({
      path,
      baudRate: 250000, // DMX512 absolute standard baud rate
      dataBits: 8,
      stopBits: 2, // DMX standard requires 2 stop bits
      parity: 'none',
      autoOpen: false,
    });

    this.port.open(err => {
      if (err) {
        this.logger.error(`Failed to open serial port ${path}: ${err.message}`);
        this.logger.warn(serialOpenHint(process.platform));
        return;
      }

      this.logger.log(`Successfully claimed FTDI Serial Port on ${path}!`);
      this.startSendingLoop();
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
    if (!this.port?.isOpen || this.frameInFlight) return;

    this.frameInFlight = true;

    // 1. Drop the line into a BREAK state (pull low) for at least 88µs
    this.port.set({ brk: true }, err => {
      if (err) {
        this.frameInFlight = false;
        return;
      }

      this.breakTimerId = setTimeout(() => {
        this.breakTimerId = null;
        if (!this.isSending || !this.port?.isOpen) {
          this.frameInFlight = false;
          return;
        }

        this.port.set({ brk: false }, err1 => {
          this.flushFrame(err1);
        });
      }, this.BREAK_DURATION_MS);
    });
  }

  /**
   * Writes the DMX buffer to the serial port after the BREAK/MAB sequence.
   * Skipped when the break-release `set()` reported an error.
   */
  private flushFrame(err1: Error | null): void {
    if (err1) {
      this.frameInFlight = false;
      this.logger.error(`Error releasing BREAK state: ${err1.message}`);
      return;
    }

    if (!this.port) {
      this.frameInFlight = false;
      return;
    }

    this.port.write(Buffer.from(this.dmxFrame), err2 => {
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

  private closePort(): void {
    if (this.port?.isOpen) {
      this.port.close(err => {
        if (err) this.logger.error(`Error cleanly closing serial port: ${err.message}`);
      });
    }
  }
}
