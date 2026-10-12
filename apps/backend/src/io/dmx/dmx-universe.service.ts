import { Injectable, Logger } from '@nestjs/common';
import { DmxValue } from './types/dmx.types';

const MANUAL_LAYER = 'manual';

@Injectable()
export class DmxUniverseService {
  public static readonly CHANNEL_COUNT = 512;

  private readonly logger = new Logger(DmxUniverseService.name);
  private readonly dmxFrame = new Uint8Array(513);
  private readonly layers = new Map<string, Map<number, number>>();

  public constructor() {
    this.dmxFrame.fill(0);
    this.layers.set(MANUAL_LAYER, new Map());
  }

  public snapshot(): number[] {
    return Array.from(this.dmxFrame.subarray(1));
  }

  public getFrame(): Uint8Array {
    return this.dmxFrame;
  }

  public apply(values: DmxValue[]): DmxValue[] {
    const manual = this.layers.get(MANUAL_LAYER) ?? new Map<number, number>();
    const touched: number[] = [];
    for (const { channel, value } of values) {
      if (!this.isValid(channel, value)) {
        continue;
      }
      manual.set(channel, value);
      touched.push(channel);
    }
    this.layers.set(MANUAL_LAYER, manual);
    return this.recompute(touched);
  }

  public setLayer(layerId: string, values: DmxValue[]): DmxValue[] {
    const previous = this.layers.get(layerId);
    const next = new Map<number, number>();
    for (const { channel, value } of values) {
      if (!this.isValid(channel, value)) {
        continue;
      }
      next.set(channel, value);
    }
    this.layers.set(layerId, next);
    return this.recompute([...(previous?.keys() ?? []), ...next.keys()]);
  }

  public clearLayer(layerId: string): DmxValue[] {
    if (layerId === MANUAL_LAYER) {
      return [];
    }
    const previous = this.layers.get(layerId);
    if (!previous) {
      return [];
    }
    this.layers.delete(layerId);
    return this.recompute([...previous.keys()]);
  }

  private isValid(channel: number, value: number): boolean {
    if (channel < 1 || channel > DmxUniverseService.CHANNEL_COUNT) {
      this.logger.warn(`Invalid DMX channel: ${channel}. Must be between 1 and 512.`);
      return false;
    }
    if (value < 0 || value > 255) {
      this.logger.warn(`Invalid DMX value: ${value}. Must be between 0 and 255.`);
      return false;
    }
    return true;
  }

  private recompute(channels: Iterable<number>): DmxValue[] {
    const applied: DmxValue[] = [];
    const seen = new Set<number>();
    for (const channel of channels) {
      if (seen.has(channel) || channel < 1 || channel > DmxUniverseService.CHANNEL_COUNT) {
        continue;
      }
      seen.add(channel);
      let level = 0;
      for (const layer of this.layers.values()) {
        const value = layer.get(channel);
        if (value !== undefined && value > level) {
          level = value;
        }
      }
      if (this.dmxFrame[channel] !== level) {
        this.dmxFrame[channel] = level;
        applied.push({ channel, value: level });
      }
    }
    return applied;
  }
}
