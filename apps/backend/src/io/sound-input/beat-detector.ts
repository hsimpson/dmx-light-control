const HISTORY_MS = 1500;
/** No beats until this much history exists: opening a stream mid-song is not an onset. */
const WARM_UP_MS = 300;
/** How many standard deviations flux must rise above its recent mean; starting value, tune it against real music. */
const ONSET_DEVIATIONS = 2;
/** Shortest gap between beats (333 BPM), so one kick spanning several windows stays one beat. */
const REFRACTORY_MS = 180;
/** Rise needed relative to the current amplitude: a steady tone's window ripple has flux but is no onset. */
const MIN_RELATIVE_RISE = 0.1;
/** Amplitude of a -60 dB signal, the floor of the level scale: below it there is nothing to react to. */
const MIN_FLUX = 1e-3;

/**
 * Reactive onset detection on positive spectral flux: the summed per-bin amplitude rise. Unlike total band energy,
 * it still sees a kick over a loud or ducked bass, and it ignores the slow beating of a detuned bass.
 */
export class BeatDetector {
  private readonly history: number[] = [];
  private readonly historyLength: number;
  private readonly warmUpFrames: number;
  private previous: number[] = [];
  private sinceBeatMs = Number.POSITIVE_INFINITY;

  public constructor(private readonly frameMs: number) {
    this.historyLength = Math.round(HISTORY_MS / frameMs);
    this.warmUpFrames = Math.round(WARM_UP_MS / frameMs);
  }

  /** Feeds the bin powers of the next window; true when that window starts a beat. */
  public push(power: readonly number[]): boolean {
    this.sinceBeatMs += this.frameMs;
    const amplitudes = power.map(Math.sqrt);
    const flux = amplitudes.reduce((sum, value, bin) => sum + Math.max(0, value - (this.previous[bin] ?? value)), 0);
    const total = amplitudes.reduce((sum, value) => sum + value, 0);
    const beat =
      this.history.length >= this.warmUpFrames &&
      flux >= MIN_FLUX &&
      flux >= MIN_RELATIVE_RISE * total &&
      flux > this.threshold() &&
      this.sinceBeatMs >= REFRACTORY_MS;
    if (beat) this.sinceBeatMs = 0;
    this.previous = amplitudes;
    this.history.push(flux);
    if (this.history.length > this.historyLength) this.history.shift();
    return beat;
  }

  private threshold(): number {
    const count = Math.max(1, this.history.length);
    const mean = this.history.reduce((sum, value) => sum + value, 0) / count;
    const variance = this.history.reduce((sum, value) => sum + (value - mean) ** 2, 0) / count;
    return mean + ONSET_DEVIATIONS * Math.sqrt(variance);
  }
}
