import { describe, expect, it } from 'vitest';
import {
  analyseWindow,
  FFT_HOP,
  FFT_SIZE,
  fft,
  monoSamples,
  smoothLevel,
  SpectrumAnalyser,
  spectrumBands,
  type SpectrumFrame,
  volumeLevel,
} from './spectrum';

function sine(hz: number, sampleRate: number, length = FFT_SIZE, amplitude = 1): Float64Array {
  return Float64Array.from({ length }, (_, index) => amplitude * Math.sin((2 * Math.PI * hz * index) / sampleRate));
}

function frameOf(samples: Float64Array, sampleRate: number): SpectrumFrame {
  return { ...analyseWindow(samples), sampleRate };
}

// ~1 kHz sits in band 4 of 8 (40 Hz–16 kHz, log-spaced).
const ONE_KHZ_BAND = 4;

describe('fft', () => {
  it('GIVEN an impulse WHEN transformed THEN every bin has magnitude 1', () => {
    const re = new Float64Array(8);
    const im = new Float64Array(8);
    re[0] = 1;

    fft(re, im);

    expect([...re]).toEqual(Array.from({ length: 8 }, () => 1));
    expect([...im].every(value => Math.abs(value) < 1e-12)).toBe(true);
  });

  it('GIVEN a cosine on bin 1 WHEN transformed THEN its energy sits in bins 1 and N-1', () => {
    const re = Float64Array.from({ length: 8 }, (_, index) => Math.cos((2 * Math.PI * index) / 8));
    const im = new Float64Array(8);

    fft(re, im);

    expect(re[1]).toBeCloseTo(4);
    expect(re[7]).toBeCloseTo(4);
    expect(re[2]).toBeCloseTo(0);
  });
});

describe('analyseWindow + spectrumBands + volumeLevel', () => {
  it('GIVEN silence WHEN analysed THEN volume and every band are 0', () => {
    const frame = frameOf(new Float64Array(FFT_SIZE), 48000);

    expect(volumeLevel(frame)).toBe(0);
    expect(spectrumBands(frame, 8)).toEqual(Array.from({ length: 8 }, () => 0));
  });

  it.each([44100, 48000])(
    'GIVEN a full-scale 1 kHz sine at %d Hz WHEN analysed THEN only its band and the volume are full',
    sampleRate => {
      const frame = frameOf(sine(1000, sampleRate), sampleRate);
      const bands = spectrumBands(frame, 8);

      expect(volumeLevel(frame)).toBeCloseTo(1, 2);
      expect(bands[ONE_KHZ_BAND]).toBeGreaterThan(0.98);
      expect(bands.filter((_, band) => band !== ONE_KHZ_BAND).every(level => level < 0.3)).toBe(true);
    },
  );

  it('GIVEN a sine halfway between two bins WHEN grouped THEN its band still sums to full scale', () => {
    const binHz = 48000 / FFT_SIZE;

    expect(spectrumBands(frameOf(sine(42.5 * binHz, 48000), 48000), 8)[ONE_KHZ_BAND]).toBeGreaterThan(0.98);
  });

  it('GIVEN a -30 dB sine WHEN analysed THEN its band and the volume read half scale', () => {
    const frame = frameOf(sine(1000, 48000, FFT_SIZE, 10 ** (-30 / 20)), 48000);

    expect(spectrumBands(frame, 8)[ONE_KHZ_BAND]).toBeCloseTo(0.5, 1);
    expect(volumeLevel(frame)).toBeCloseTo(0.5, 2);
  });

  it('GIVEN silence with a DC offset WHEN analysed THEN the lowest band stays at 0', () => {
    const frame = frameOf(new Float64Array(FFT_SIZE).fill(0.01), 48000);

    expect(spectrumBands(frame, 8)[0]).toBe(0);
    expect(volumeLevel(frame)).toBe(0);
  });

  it('GIVEN 16 bands WHEN two narrow bass bands are read THEN each reads its own bin', () => {
    // Band 1 is ~58–84 Hz, band 2 ~84–122 Hz; a 70 Hz tone must favour band 1.
    const bands = spectrumBands(frameOf(sine(70, 48000), 48000), 16);

    expect(bands[1]).toBeGreaterThan(bands[2] ?? 1);
  });

  it('GIVEN an empty frame WHEN grouped THEN all bands are 0', () => {
    expect(spectrumBands({ power: [], sampleRate: 48000, meanSquare: 0 }, 3)).toEqual([0, 0, 0]);
  });
});

describe('SpectrumAnalyser', () => {
  it.each([256, 512, 1024, 4096])(
    'GIVEN %d-sample buffers WHEN a 1 kHz tone streams in THEN the spectrum does not depend on the buffer size',
    size => {
      const analyser = new SpectrumAnalyser(48000);
      const tone = sine(1000, 48000, FFT_SIZE * 4);

      for (let start = 0; start < tone.length; start += size) analyser.push(tone.subarray(start, start + size));
      const frame = analyser.take();

      expect(frame && spectrumBands(frame, 8)[ONE_KHZ_BAND]).toBeGreaterThan(0.98);
      expect(frame && spectrumBands(frame, 8)[0]).toBeLessThan(0.3);
    },
  );

  it('GIVEN fewer samples than one window WHEN taken THEN there is no frame yet', () => {
    const analyser = new SpectrumAnalyser(48000);
    analyser.push(new Float64Array(FFT_SIZE - 1));

    expect(analyser.take()).toBeNull();
  });

  it('GIVEN a silent then a loud window WHEN taken THEN the frames are averaged, not max-held', () => {
    const analyser = new SpectrumAnalyser(48000);
    analyser.push(new Float64Array(FFT_SIZE));
    analyser.push(sine(1000, 48000, FFT_HOP * 2));

    const frame = analyser.take();
    const loud = frameOf(sine(1000, 48000), 48000);

    expect(frame?.meanSquare).toBeLessThan(loud.meanSquare);
    expect(analyser.take()).toBeNull();
  });
});

describe('monoSamples', () => {
  it('GIVEN interleaved stereo PCM WHEN mixed THEN each frame is the channel average', () => {
    const pcm = Buffer.alloc(8);
    [16384, 0, -16384, -16384].forEach((sample, index) => pcm.writeInt16LE(sample, index * 2));

    expect([...monoSamples(pcm, 2)]).toEqual([0.25, -0.5]);
  });
});

describe('smoothLevel', () => {
  it('GIVEN a jump up and a drop WHEN smoothed over 20 ms THEN it rises faster than it falls', () => {
    const rise = smoothLevel(0, 1, 20);
    const fall = 1 - smoothLevel(1, 0, 20);

    expect(rise).toBeGreaterThan(0.35);
    expect(fall).toBeLessThan(0.1);
    expect(smoothLevel(0.4, 0.4, 20)).toBe(0.4);
  });
});
