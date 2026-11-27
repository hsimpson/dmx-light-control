import { Readable } from 'node:stream';
import { kickTrackWav } from '@/testhelpers/wav';
import { describe, expect, it } from 'vitest';
import {
  AUDIO_BYTES_PER_FRAME,
  AUDIO_SAMPLE_RATE,
  AudioDecodeError,
  decodeAudio,
  LinearResampler,
} from './decode-audio';

function chunked(buffer: Buffer, size = 16384): Readable {
  return Readable.from(
    Array.from({ length: Math.ceil(buffer.length / size) }, (_, index) =>
      buffer.subarray(index * size, (index + 1) * size),
    ),
  );
}

async function decodeAll(
  wav: Buffer,
  maxDurationMs = 60_000,
): Promise<{ analysed: Awaited<ReturnType<typeof decodeAudio>>; pcm: Buffer }> {
  const parts: Buffer[] = [];
  const write = (pcm: Buffer) => {
    parts.push(pcm);
  };
  const analysed = await decodeAudio(chunked(wav), 'wav', write, maxDurationMs);
  return { analysed, pcm: Buffer.concat(parts) };
}

describe('decodeAudio', () => {
  it('GIVEN a 44.1 kHz kick track at 120 BPM WHEN decoded THEN beats land on the kicks within one hop (21 ms)', async () => {
    const kicksMs = [1000, 1500, 2000, 2500, 3000, 3500];

    const { analysed } = await decodeAll(kickTrackWav(44100, 4000, 500, 1000));

    expect(analysed.beatsMs).toHaveLength(kicksMs.length);
    analysed.beatsMs.forEach((beat, index) => {
      expect(Math.abs(beat - (kicksMs[index] ?? 0))).toBeLessThanOrEqual(21);
    });
  });

  it('GIVEN a 2 s mono file WHEN decoded THEN it writes 2 s of 48 kHz stereo PCM with 20 peaks per second', async () => {
    const { analysed, pcm } = await decodeAll(kickTrackWav(44100, 2000, 500, 0));

    expect(analysed.durationMs).toBeGreaterThanOrEqual(1999);
    expect(analysed.durationMs).toBeLessThanOrEqual(2000);
    expect(Math.abs(pcm.length / AUDIO_BYTES_PER_FRAME - 2 * AUDIO_SAMPLE_RATE)).toBeLessThanOrEqual(2);
    expect(analysed.peaks).toHaveLength(40);
    expect(Math.max(...analysed.peaks)).toBeGreaterThan(0.5);
    const frames = Array.from({ length: pcm.length / AUDIO_BYTES_PER_FRAME }, (_, frame) => frame * 4);
    expect(frames.every(offset => pcm.readInt16LE(offset) === pcm.readInt16LE(offset + 2))).toBe(true);
  });

  it('GIVEN silence WHEN decoded THEN there are no beats and every peak is 0', async () => {
    const { analysed } = await decodeAll(kickTrackWav(48000, 1000, 500, 5000));

    expect(analysed.beatsMs).toEqual([]);
    expect(analysed.peaks.every(peak => peak === 0)).toBe(true);
  });

  it('GIVEN bytes that are no WAV WHEN decoded THEN it rejects as undecodable', async () => {
    await expect(decodeAll(Buffer.from('not audio at all, definitely not a RIFF header'))).rejects.toBeInstanceOf(
      AudioDecodeError,
    );
  });

  it('GIVEN a header claiming 1 Hz WHEN decoded THEN it rejects before upsampling', async () => {
    await expect(decodeAll(kickTrackWav(1, 3_000_000, 500, 0))).rejects.toThrow('Unsupported sample rate 1');
  });

  it('GIVEN audio longer than the limit WHEN decoded THEN it rejects', async () => {
    await expect(decodeAll(kickTrackWav(44100, 2000, 500, 0), 1000)).rejects.toThrow('Audio is too long');
  });
});

describe('LinearResampler', () => {
  it('GIVEN a ramp split into chunks WHEN doubled in rate THEN the output is the seamless interpolated ramp', () => {
    const resampler = new LinearResampler(1, 2);
    const ramp = Float32Array.from({ length: 8 }, (_, index) => index);

    const parts = [ramp.subarray(0, 3), ramp.subarray(3)].map(part => resampler.push(part, part)[0]);

    expect(parts.flatMap(part => [...part])).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5]);
  });

  it.each([
    [3, 2],
    [147, 160],
  ])('GIVEN a %i→%i rate WHEN fed in odd chunks THEN the output equals one-shot resampling', (from, to) => {
    const signal = Float32Array.from({ length: 1000 }, (_, index) => Math.sin(index / 7));
    const oneShot = new LinearResampler(from, to).push(signal, signal)[0];
    const resampler = new LinearResampler(from, to);

    const borders = [0, 13, 14, 401, 777, 1000];

    const chunkedOutput = borders.slice(1).flatMap((end, index) => {
      const part = signal.subarray(borders[index], end);
      return [...resampler.push(part, part)[0]];
    });

    expect(chunkedOutput).toHaveLength(oneShot.length);
    expect(chunkedOutput.every((value, index) => Math.abs(value - (oneShot[index] ?? NaN)) < 1e-6)).toBe(true);
  });

  it('GIVEN equal rates WHEN resampled THEN samples pass through unchanged across chunks', () => {
    const resampler = new LinearResampler(48000, 48000);

    const first = resampler.push(Float32Array.of(1, 2, 3), Float32Array.of(-1, -2, -3));
    const second = resampler.push(Float32Array.of(4, 5), Float32Array.of(-4, -5));

    expect([...first[0], ...second[0]]).toEqual([1, 2, 3, 4]);
    expect([...first[1], ...second[1]]).toEqual([-1, -2, -3, -4]);
  });
});
