import { Injectable, Logger } from '@nestjs/common';
import { DmxValue } from './types/dmx.types';

@Injectable()
export class DmxUniverseService {
  public static readonly CHANNEL_COUNT = 512;

  private readonly logger = new Logger(DmxUniverseService.name);
  private readonly dmxFrame = new Uint8Array(513);

  public constructor() {
    this.dmxFrame.fill(0);
  }

  public snapshot(): number[] {
    return Array.from(this.dmxFrame.subarray(1));
  }

  public getFrame(): Uint8Array {
    return this.dmxFrame;
  }

  public apply(values: DmxValue[]): DmxValue[] {
    const applied: DmxValue[] = [];
    for (const { channel, value } of values) {
      if (channel < 1 || channel > DmxUniverseService.CHANNEL_COUNT) {
        this.logger.warn(`Invalid DMX channel: ${channel}. Must be between 1 and 512.`);
        continue;
      }
      if (value < 0 || value > 255) {
        this.logger.warn(`Invalid DMX value: ${value}. Must be between 0 and 255.`);
        continue;
      }
      this.dmxFrame[channel] = value;
      applied.push({ channel, value });
    }
    return applied;
  }
}
