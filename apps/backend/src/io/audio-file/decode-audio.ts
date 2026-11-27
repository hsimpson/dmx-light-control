import { decodeChunked } from '@audio/decode';
import { FFT_HOP, SpectrumAnalyser } from '@/io/sound-input/spectrum';

/** Stored and played PCM: interleaved signed 16-bit stereo at this rate. */
export const AUDIO_SAMPLE_RATE = 48000;
export const AUDIO_CHANNELS = 2;
export const AUDIO_BYTES_PER_FRAME = AUDIO_CHANNELS * 2;
export const WAVEFORM_PEAKS_PER_SECOND = 20;

export type AudioFileFormat = 'mp3' | 'wav' | 'flac' | 'oga' | 'opus';

export type AnalysedAudio = { durationMs: number; beatsMs: number[]; peaks: number[] };

const INT16_FULL_SCALE = 32767;
const FRAMES_PER_PEAK = AUDIO_SAMPLE_RATE / WAVEFORM_PEAKS_PER_SECOND;
// Decoders trust the header; a forged 1 Hz rate would upsample one chunk into gigabytes.
const MIN_SOURCE_RATE = 8000;
const MAX_SOURCE_RATE = 192000;

/** The file is no decodable audio, or it breaks the rate or length bounds. */
export class AudioDecodeError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'AudioDecodeError';
  }
}

/**
 * Decodes `source` chunk by chunk, hands 48 kHz stereo s16le PCM to `write` and analyses it on the way:
 * beats with the live sound input's detector, so a show's grid matches what the audio trigger would see.
 */
export async function decodeAudio(
  source: AsyncIterable<Uint8Array>,
  format: AudioFileFormat,
  write: (pcm: Buffer) => Promise<void> | void,
  maxDurationMs: number,
): Promise<AnalysedAudio> {
  const analysis = new AudioAnalysis();
  const chunks = decodeChunked(source, format);
  let resampler: LinearResampler | null = null;
  for (let chunk = await nextChunk(chunks); chunk; chunk = await nextChunk(chunks)) {
    const left = chunk.channelData[0];
    if (!left?.length) continue;
    // Mono plays on both sides; more than two channels keep the front pair.
    const right = chunk.channelData[1] ?? left;
    resampler ??= new LinearResampler(checkedRate(chunk.sampleRate), AUDIO_SAMPLE_RATE);
    const [outLeft, outRight] = resampler.push(left, right);
    analysis.push(outLeft, outRight);
    if (analysis.durationMs() > maxDurationMs) throw new AudioDecodeError('Audio is too long');
    await write(interleaveInt16(outLeft, outRight));
  }
  return analysis.result();
}

type DecodedChunk = { channelData: Float32Array[]; sampleRate: number };

// Only decoder failures become AudioDecodeError; write errors (disk full) must surface as what they are.
async function nextChunk(chunks: AsyncGenerator<DecodedChunk>): Promise<DecodedChunk | null> {
  try {
    const next = await chunks.next();
    return next.done ? null : next.value;
  } catch (error) {
    throw new AudioDecodeError(error instanceof Error ? error.message : 'Undecodable audio');
  }
}

function checkedRate(sampleRate: number): number {
  if (!(sampleRate >= MIN_SOURCE_RATE && sampleRate <= MAX_SOURCE_RATE)) {
    throw new AudioDecodeError(`Unsupported sample rate ${sampleRate}`);
  }
  return sampleRate;
}

/** Streaming linear interpolation; keeps the last input sample so chunk borders stay seamless. */
// shortcut: no anti-alias filter, so downsampling (e.g. 96 kHz) aliases a little; add a low-pass if playback sounds harsh.
export class LinearResampler {
  private readonly step: number;
  // Next output position in input samples, relative to the current chunk; -1..0 interpolates from the previous chunk.
  private position = 0;
  private previous: [number, number] = [0, 0];

  public constructor(fromRate: number, toRate: number) {
    this.step = fromRate / toRate;
  }

  public push(left: Float32Array, right: Float32Array): [Float32Array, Float32Array] {
    const length = left.length;
    const count = Math.max(0, Math.ceil((length - 1 - this.position) / this.step));
    const outLeft = new Float32Array(count);
    const outRight = new Float32Array(count);
    for (let index = 0; index < count; index++) {
      const position = this.position + index * this.step;
      const base = Math.floor(position);
      const fraction = position - base;
      outLeft[index] = this.lerp(left, base, fraction, 0);
      outRight[index] = this.lerp(right, base, fraction, 1);
    }
    this.position += count * this.step - length;
    this.previous = [left[length - 1] ?? 0, right[length - 1] ?? 0];
    return [outLeft, outRight];
  }

  private lerp(samples: Float32Array, base: number, fraction: number, channel: 0 | 1): number {
    const from = base < 0 ? this.previous[channel] : (samples[base] ?? 0);
    const to = samples[base + 1] ?? from;
    return from + (to - from) * fraction;
  }
}

class AudioAnalysis {
  private readonly analyser = new SpectrumAnalyser(AUDIO_SAMPLE_RATE);
  private readonly hop = new Float64Array(FFT_HOP);
  private hopFill = 0;
  private analysedFrames = 0;
  private frames = 0;
  private peak = 0;
  private readonly beatsMs: number[] = [];
  private readonly peaks: number[] = [];

  public push(left: Float32Array, right: Float32Array): void {
    for (let index = 0; index < left.length; index++) {
      const l = left[index] ?? 0;
      const r = right[index] ?? 0;
      this.peak = Math.max(this.peak, Math.abs(l), Math.abs(r));
      if (++this.frames % FRAMES_PER_PEAK === 0) this.flushPeak();
      this.hop[this.hopFill++] = (l + r) / 2;
      if (this.hopFill === FFT_HOP) this.analyseHop();
    }
  }

  public durationMs(): number {
    return Math.round((this.frames / AUDIO_SAMPLE_RATE) * 1000);
  }

  public result(): AnalysedAudio {
    if (this.frames % FRAMES_PER_PEAK !== 0) this.flushPeak();
    return {
      durationMs: this.durationMs(),
      beatsMs: this.beatsMs,
      peaks: this.peaks,
    };
  }

  // One hop completes at most one window, so a returned beat belongs to the window ending here.
  private analyseHop(): void {
    this.hopFill = 0;
    this.analysedFrames += FFT_HOP;
    if (this.analyser.push(this.hop).length === 0) return;
    // The onset is new in this window, so it lies in the hop just added: its middle is the best estimate.
    const onsetFrame = this.analysedFrames - FFT_HOP / 2;
    this.beatsMs.push(Math.round((onsetFrame / AUDIO_SAMPLE_RATE) * 1000));
  }

  private flushPeak(): void {
    this.peaks.push(Math.round(Math.min(1, this.peak) * 1000) / 1000);
    this.peak = 0;
  }
}

// Int16Array uses the platform byte order; every supported host (x64, arm64) is little-endian like the stored PCM.
function interleaveInt16(left: Float32Array, right: Float32Array): Buffer {
  const samples = new Int16Array(left.length * AUDIO_CHANNELS);
  for (let index = 0; index < left.length; index++) {
    samples[index * AUDIO_CHANNELS] = toInt16(left[index] ?? 0);
    samples[index * AUDIO_CHANNELS + 1] = toInt16(right[index] ?? 0);
  }
  return Buffer.from(samples.buffer);
}

function toInt16(sample: number): number {
  return Math.round(Math.max(-1, Math.min(1, sample)) * INT16_FULL_SCALE);
}
