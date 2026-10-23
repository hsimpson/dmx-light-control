import { AppEventEmitter } from '@/events/app-event-emitter';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DmxValue } from '../dmx/types/dmx.types';
import { DmxSerialPort } from './dmx-serial-port';

const LINUX_OPEN_HINT = 'Ensure the user is in the dialout group (sudo usermod -aG dialout $USER).';

@Injectable()
export class SerialSendService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SerialSendService.name);

  private readonly ports = new Map<string, DmxSerialPort>();
  // Shared by every port so an output opened later starts with the current universe.
  private readonly dmxFrame = new Uint8Array(513); // Index 0 = Start Code (0x00), 1-512 = Channels
  private intervalId: NodeJS.Timeout | null = null;

  // Configuration constants
  private readonly REFRESH_RATE_MS = 33; // ~30 Hz refresh rate

  public constructor(private readonly eventEmitter: AppEventEmitter) {}

  public onModuleInit(): void {
    this.eventEmitter.on('dmx.channelValues', (values: DmxValue[]) => {
      this.setChannelValues(values);
    });
  }

  public onModuleDestroy(): void {
    for (const path of [...this.ports.keys()]) {
      this.close(path);
    }
  }

  public openPaths(): string[] {
    return [...this.ports.keys()];
  }

  /** Opens a DMX output; failures are logged and the caller retries on its next reconcile. */
  public async open(path: string): Promise<boolean> {
    if (this.ports.has(path)) return true;

    this.logger.log(`Connecting to DMX interface on ${path}...`);
    try {
      const port = await DmxSerialPort.open(path, () => {
        this.forget(path);
      });
      this.ports.set(path, port);
    } catch (err) {
      this.logger.error(`Failed to open serial port ${path}: ${err instanceof Error ? err.message : String(err)}`);
      if (process.platform === 'linux') this.logger.warn(LINUX_OPEN_HINT);
      return false;
    }

    this.logger.log(`Opened DMX interface on ${path}`);
    this.startSendingLoop();
    return true;
  }

  public close(path: string): void {
    this.ports.get(path)?.close();
    this.forget(path);
  }

  private forget(path: string): void {
    if (!this.ports.delete(path)) return;
    this.logger.log(`Closed DMX interface on ${path}`);
    if (this.ports.size === 0) this.stopSendingLoop();
  }

  private startSendingLoop(): void {
    if (this.intervalId) return;

    this.logger.log(`🚀 Starting DMX frame broadcast stream (~${Math.round(1000 / this.REFRESH_RATE_MS)}Hz)`);
    this.intervalId = setInterval(() => {
      for (const port of this.ports.values()) {
        port.sendFrame(this.dmxFrame);
      }
    }, this.REFRESH_RATE_MS);
  }

  private stopSendingLoop(): void {
    if (!this.intervalId) return;
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.logger.log('🛑 Stopped DMX frame broadcast stream.');
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
}
