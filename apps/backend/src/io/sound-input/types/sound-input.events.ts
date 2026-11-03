import type { SpectrumFrame } from '../spectrum';

export type SoundInputEvents = {
  /** Per-channel peak (0..1) of the open sound input, throttled to the meter rate. */
  'soundInput.level': { levels: number[] };
  /** Mean spectrum of the windows analysed since the last emit (same rate); empty `power` when the input closed. */
  'soundInput.spectrum': SpectrumFrame;
};
