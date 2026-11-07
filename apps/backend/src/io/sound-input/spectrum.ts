import { BeatDetector } from './beat-detector';

/** Analysis window; at 48 kHz bins are ~23 Hz wide, enough to separate bass bands. */
export const FFT_SIZE = 2048;
/** 50 % overlap: a new frame every 1024 samples (~21 ms at 48 kHz), whatever buffer size the driver grants. */
export const FFT_HOP = FFT_SIZE / 2;
export const SPECTRUM_MIN_HZ = 40;
export const SPECTRUM_MAX_HZ = 16000;

// Kick and bass fundamentals; hi-hats and vocals must not trigger beats.
const BEAT_MIN_HZ = 40;
const BEAT_MAX_HZ = 150;
const FLOOR_DB = -60;
const INT16_FULL_SCALE = 32768;
const BYTES_PER_SAMPLE = 2;
// One-sided energy of a full-scale sine under a Hann window (Parseval): 3N²/32. A band holding the
// whole main lobe of such a sine therefore sums to 1, wherever the sine falls between bins.
const FULL_SCALE_SINE_ENERGY = (3 * FFT_SIZE * FFT_SIZE) / 32;
const ATTACK_MS = 40;
const RELEASE_MS = 200;

const HANN = Float64Array.from(
  { length: FFT_SIZE },
  (_, index) => 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / FFT_SIZE),
);

/** Mean of the analysed frames since the last emit: normalised one-sided bin power and mean sample square. */
export type SpectrumFrame = { power: number[]; sampleRate: number; meanSquare: number };

/** Interleaved signed 16-bit PCM → mono samples in -1..1. */
export function monoSamples(pcm: Buffer, channels: number): Float64Array {
  const frames = Math.floor(pcm.length / BYTES_PER_SAMPLE / channels);
  const mono = new Float64Array(frames);
  for (let frame = 0; frame < frames; frame++) {
    let sum = 0;
    for (let channel = 0; channel < channels; channel++) {
      sum += pcm.readInt16LE((frame * channels + channel) * BYTES_PER_SAMPLE);
    }
    mono[frame] = sum / channels / INT16_FULL_SCALE;
  }
  return mono;
}

/** Collects samples into overlapping windows and averages their spectra until `take()`. */
export class SpectrumAnalyser {
  private buffered = new Float64Array(0);
  private powerSum: number[] = [];
  private squareSum = 0;
  private frames = 0;
  private readonly beatDetector: BeatDetector;
  private readonly beatBins: [number, number];

  public constructor(private readonly sampleRate: number) {
    this.beatDetector = new BeatDetector((FFT_HOP / sampleRate) * 1000);
    this.beatBins = bandBins(BEAT_MIN_HZ, BEAT_MAX_HZ, sampleRate / FFT_SIZE);
  }

  /** Analyses every full window and returns the bass level (0..1) of each beat found in them. */
  public push(samples: Float64Array): number[] {
    const joined = new Float64Array(this.buffered.length + samples.length);
    joined.set(this.buffered);
    joined.set(samples, this.buffered.length);
    const beats: number[] = [];
    let start = 0;
    for (; start + FFT_SIZE <= joined.length; start += FFT_HOP) {
      const analysed = analyseWindow(joined.subarray(start, start + FFT_SIZE));
      this.add(analysed);
      // Per window, not per emitted frame: the emit rate would average a kick away.
      const [first, last] = this.beatBins;
      if (this.beatDetector.push(analysed.power.slice(first, last + 1))) {
        beats.push(decibelsToLevel(10 * Math.log10(binEnergy(analysed.power, this.beatBins))));
      }
    }
    this.buffered = joined.slice(start);
    return beats;
  }

  /** Mean frame since the previous take, or null when no full window was analysed yet. */
  public take(): SpectrumFrame | null {
    if (this.frames === 0) return null;
    const count = this.frames;
    const frame = {
      power: this.powerSum.map(sum => sum / count),
      sampleRate: this.sampleRate,
      meanSquare: this.squareSum / count,
    };
    this.powerSum = [];
    this.squareSum = 0;
    this.frames = 0;
    return frame;
  }

  private add({ power, meanSquare }: { power: number[]; meanSquare: number }): void {
    this.powerSum = power.map((value, bin) => value + (this.powerSum[bin] ?? 0));
    this.squareSum += meanSquare;
    this.frames++;
  }
}

/** Hann-windowed power spectrum of exactly `FFT_SIZE` samples, DC removed. */
export function analyseWindow(samples: Float64Array): { power: number[]; meanSquare: number } {
  // A DC offset (common on cheap USB inputs) would otherwise leak into the lowest band.
  const mean = samples.reduce((sum, sample) => sum + sample, 0) / FFT_SIZE;
  const re = new Float64Array(FFT_SIZE);
  const im = new Float64Array(FFT_SIZE);
  let squares = 0;
  samples.forEach((sample, index) => {
    const centred = sample - mean;
    squares += centred * centred;
    re[index] = centred * (HANN[index] ?? 0);
  });
  fft(re, im);
  const power = Array.from({ length: FFT_SIZE / 2 + 1 }, (_, bin) => {
    const real = re[bin] ?? 0;
    const imaginary = im[bin] ?? 0;
    return (real * real + imaginary * imaginary) / FULL_SCALE_SINE_ENERGY;
  });
  return { power, meanSquare: squares / FFT_SIZE };
}

/** Volume 0..1; RMS·√2 makes a full-scale sine read 0 dB, like a full band. */
export function volumeLevel({ meanSquare }: SpectrumFrame): number {
  return decibelsToLevel(10 * Math.log10(2 * meanSquare));
}

/** Level 0..1 per log-spaced band between `SPECTRUM_MIN_HZ` and `SPECTRUM_MAX_HZ`. */
export function spectrumBands({ power, sampleRate }: SpectrumFrame, count: number): number[] {
  if (power.length < 2) return Array.from({ length: count }, () => 0);
  const binHz = sampleRate / (2 * (power.length - 1));
  const ratio = SPECTRUM_MAX_HZ / SPECTRUM_MIN_HZ;
  return Array.from({ length: count }, (_, band) => {
    const bins = bandBins(
      SPECTRUM_MIN_HZ * ratio ** (band / count),
      SPECTRUM_MIN_HZ * ratio ** ((band + 1) / count),
      binHz,
    );
    return decibelsToLevel(10 * Math.log10(binEnergy(power, bins)));
  });
}

function binEnergy(power: readonly number[], [first, last]: [number, number]): number {
  let sum = 0;
  for (let bin = first; bin <= last; bin++) sum += power[bin] ?? 0;
  return sum;
}

/** One-pole smoothing: rises fast, falls slowly, so lights follow hits without flicker. */
export function smoothLevel(previous: number, next: number, elapsedMs: number): number {
  const timeConstant = next > previous ? ATTACK_MS : RELEASE_MS;
  return previous + (next - previous) * (1 - Math.exp(-elapsedMs / timeConstant));
}

/** Bins whose centre lies in [low, high); a band narrower than one bin reads the bin nearest its geometric centre. */
function bandBins(low: number, high: number, binHz: number): [number, number] {
  const first = Math.ceil(low / binHz);
  const last = Math.ceil(high / binHz) - 1;
  if (last >= first) return [first, last];
  const nearest = Math.round(Math.sqrt(low * high) / binHz);
  return [nearest, nearest];
}

function decibelsToLevel(decibels: number): number {
  if (!Number.isFinite(decibels)) return 0;
  return Math.min(1, Math.max(0, (decibels - FLOOR_DB) / -FLOOR_DB));
}

/** In-place iterative radix-2 FFT; the length must be a power of two. */
export function fft(re: Float64Array, im: Float64Array): void {
  bitReversePermute(re, im);
  for (let span = 2; span <= re.length; span <<= 1) {
    for (let start = 0; start < re.length; start += span) {
      butterflies(re, im, start, span);
    }
  }
}

function bitReversePermute(re: Float64Array, im: Float64Array): void {
  for (let index = 1, reversed = 0; index < re.length; index++) {
    let bit = re.length >> 1;
    for (; reversed & bit; bit >>= 1) reversed ^= bit;
    reversed ^= bit;
    if (index < reversed) {
      swap(re, index, reversed);
      swap(im, index, reversed);
    }
  }
}

function swap(values: Float64Array, a: number, b: number): void {
  const temporary = values[a] ?? 0;
  values[a] = values[b] ?? 0;
  values[b] = temporary;
}

function butterflies(re: Float64Array, im: Float64Array, start: number, span: number): void {
  const angle = (-2 * Math.PI) / span;
  for (let offset = 0; offset < span / 2; offset++) {
    const even = start + offset;
    const odd = even + span / 2;
    const cos = Math.cos(angle * offset);
    const sin = Math.sin(angle * offset);
    const [evenRe, evenIm, oddReIn, oddImIn] = [re[even] ?? 0, im[even] ?? 0, re[odd] ?? 0, im[odd] ?? 0];
    const oddRe = oddReIn * cos - oddImIn * sin;
    const oddIm = oddReIn * sin + oddImIn * cos;
    re[odd] = evenRe - oddRe;
    im[odd] = evenIm - oddIm;
    re[even] = evenRe + oddRe;
    im[even] = evenIm + oddIm;
  }
}
