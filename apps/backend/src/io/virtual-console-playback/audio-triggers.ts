import { spectrumBands, volumeLevel, type SpectrumFrame } from '@/io/sound-input/spectrum';
import type { VirtualConsoleAudioBar, VirtualConsoleControl } from '@/projects/virtual-console';

const DMX_MAX = 255;
const PERCENT = 100;

/** Raw levels 0..1 of an audio triggers control: volume first, then one per band. */
export function barLevels(control: Pick<VirtualConsoleControl, 'bandCount'>, frame: SpectrumFrame): number[] {
  return [volumeLevel(frame), ...spectrumBands(frame, control.bandCount ?? 0)];
}

/** 0 at or below the min threshold, full at or above the max, linear in between. */
export function thresholdDmx(level: number, { minThreshold, maxThreshold }: VirtualConsoleAudioBar): number {
  const percent = level * PERCENT;
  if (percent <= minThreshold) return 0;
  if (percent >= maxThreshold) return DMX_MAX;
  return Math.round(((percent - minThreshold) / (maxThreshold - minThreshold)) * DMX_MAX);
}

/** Hysteresis: switches on at the max threshold and only off again below the min, so it does not chatter. */
export function nextFunctionState(
  level: number,
  { minThreshold, maxThreshold }: VirtualConsoleAudioBar,
  active: boolean,
) {
  const percent = level * PERCENT;
  if (!active) return percent >= maxThreshold;
  return percent >= minThreshold;
}
