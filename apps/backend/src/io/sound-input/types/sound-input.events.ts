export type SoundInputEvents = {
  /** Per-channel peak (0..1) of the open sound input, throttled to the meter rate. */
  'soundInput.level': { levels: number[] };
};
