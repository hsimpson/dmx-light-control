import { describe, expect, it } from 'vitest';
import { FFT_HOP, SpectrumAnalyser } from './spectrum';

const SAMPLE_RATE = 48000;
const LEAD_IN_S = 1;
/** Detector latency budget: a beat later than this after the kick no longer looks like it. */
const MATCH_WINDOW_S = 0.15;

type Beat = { atSeconds: number; level: number };

const silence = (seconds: number, sampleRate = SAMPLE_RATE) => new Float64Array(Math.round(seconds * sampleRate));

const tone = (hz: number, seconds: number, amplitude = 0.8, sampleRate = SAMPLE_RATE) =>
  Float64Array.from({ length: Math.round(seconds * sampleRate) }, (_, index) => {
    return amplitude * Math.sin((2 * Math.PI * hz * index) / sampleRate);
  });

/** Kick drum: pitch sweeps from 160 Hz down to 55 Hz under an 80 ms amplitude decay. */
const kickDrum = (sampleRate = SAMPLE_RATE, amplitude = 0.8) => {
  let phase = 0;
  return Float64Array.from({ length: Math.round(0.4 * sampleRate) }, (_, index) => {
    const seconds = index / sampleRate;
    phase += (2 * Math.PI * (55 + 105 * Math.exp(-seconds / 0.03))) / sampleRate;
    return amplitude * Math.exp(-seconds / 0.08) * Math.sin(phase);
  });
};

const hiHat = (sampleRate = SAMPLE_RATE) =>
  Float64Array.from({ length: Math.round(0.1 * sampleRate) }, (_, index) => {
    const seconds = index / sampleRate;
    return 0.8 * Math.exp(-seconds / 0.02) * Math.sin(2 * Math.PI * 8000 * seconds);
  });

const mix = (...layers: Float64Array[]) => {
  const mixed = new Float64Array(Math.max(...layers.map(layer => layer.length)));
  for (const layer of layers) layer.forEach((sample, index) => (mixed[index] = (mixed[index] ?? 0) + sample));
  return mixed;
};

/** Places `hit` every `intervalSeconds` after the lead-in; returns the signal and each hit's start time. */
const pattern = (hit: Float64Array, count: number, intervalSeconds = 0.5, sampleRate = SAMPLE_RATE) => {
  const signal = new Float64Array(Math.round((LEAD_IN_S + count * intervalSeconds + 0.5) * sampleRate));
  const onsets = Array.from({ length: count }, (_, index) => LEAD_IN_S + index * intervalSeconds);
  for (const onset of onsets) signal.set(hit, Math.round(onset * sampleRate));
  return { signal, onsets };
};

/** Feeds one hop at a time, so each beat's time is known to one window. */
const beatsIn = (samples: Float64Array, sampleRate = SAMPLE_RATE): Beat[] => {
  const analyser = new SpectrumAnalyser(sampleRate);
  const beats: Beat[] = [];
  for (let start = 0; start < samples.length; start += FFT_HOP) {
    const end = Math.min(start + FFT_HOP, samples.length);
    for (const level of analyser.push(samples.subarray(start, end))) {
      beats.push({ atSeconds: end / sampleRate, level });
    }
  }
  return beats;
};

const missed = (beats: Beat[], onsets: number[]) =>
  onsets.filter(onset => !beats.some(({ atSeconds }) => atSeconds >= onset && atSeconds < onset + MATCH_WINDOW_S));

const extra = (beats: Beat[], onsets: number[]) =>
  beats.filter(({ atSeconds }) => !onsets.some(onset => atSeconds >= onset && atSeconds < onset + MATCH_WINDOW_S));

describe('beat detection', () => {
  it.each([
    ['120 BPM at 48 kHz', 0.5, 48000],
    ['120 BPM at 44.1 kHz', 0.5, 44100],
    ['174 BPM at 48 kHz', 60 / 174, 48000],
    ['90 BPM at 48 kHz', 60 / 90, 48000],
  ])('GIVEN kicks at %s WHEN analysed THEN each kick is one beat at its own time', (_, interval, rate) => {
    const { signal, onsets } = pattern(kickDrum(rate), 16, interval, rate);

    const beats = beatsIn(signal, rate);

    expect(missed(beats, onsets)).toEqual([]);
    expect(extra(beats, onsets)).toEqual([]);
    expect(beats).toHaveLength(16);
  });

  it('GIVEN running kicks WHEN analysed THEN beats report a strong bass level', () => {
    const { signal } = pattern(kickDrum(), 8);

    // Not the first kick: firing on its first window keeps latency low, but that window barely holds it yet.
    for (const { level } of beatsIn(signal).slice(1)) {
      expect(level).toBeGreaterThan(0.5);
      expect(level).toBeLessThanOrEqual(1);
    }
  });

  it('GIVEN kicks split into small driver buffers WHEN analysed THEN the beats do not change', () => {
    const { signal } = pattern(kickDrum(), 8);
    const analyser = new SpectrumAnalyser(SAMPLE_RATE);
    const levels: number[] = [];
    for (let start = 0; start < signal.length; start += 512) {
      levels.push(...analyser.push(signal.subarray(start, start + 512)));
    }

    expect(levels).toEqual(beatsIn(signal).map(({ level }) => level));
  });

  it('GIVEN digital silence WHEN analysed THEN there are no beats', () => {
    expect(beatsIn(silence(4))).toEqual([]);
  });

  it('GIVEN only a -70 dB noise floor WHEN analysed THEN there are no beats', () => {
    let seed = 1;
    const noise = Float64Array.from({ length: SAMPLE_RATE * 8 }, () => {
      seed = (seed * 48271) % 2147483647;
      return ((seed / 2147483647) * 2 - 1) * 10 ** (-70 / 20);
    });

    expect(beatsIn(noise)).toEqual([]);
  });

  it.each([
    ['one tone', [tone(60, 8)], 0],
    ['a detuned bass', [tone(55, 20, 0.4), tone(57, 20, 0.4)], 3],
    ['a bass fifth', [tone(55, 20, 0.4), tone(82.5, 20, 0.4)], 3],
    // The sum fades to nothing every 2 s, so one beat per swell is what it really sounds like.
    ['a slow beating bass', [tone(55, 20, 0.4), tone(55.5, 20, 0.4)], 10],
  ])('GIVEN %s held steady WHEN analysed THEN it does not keep firing', (_, layers, limit) => {
    expect(beatsIn(mix(...layers)).length).toBeLessThanOrEqual(limit);
  });

  it('GIVEN a drop after a long break WHEN analysed THEN the kicks count from the start', () => {
    const { signal, onsets } = pattern(kickDrum(), 16);
    const breakSeconds = 4;
    const bass = tone(55, signal.length / SAMPLE_RATE, 0.4);
    const drop = mix(signal, bass);
    const song = new Float64Array(silence(breakSeconds).length + drop.length);
    song.set(drop, silence(breakSeconds).length);

    const beats = beatsIn(song);

    expect(
      missed(
        beats,
        onsets.map(onset => onset + breakSeconds),
      ).length,
    ).toBeLessThanOrEqual(1);
  });

  it('GIVEN kicks dropping 20 dB WHEN analysed THEN beats recover once the loud part left the history', () => {
    const loud = pattern(kickDrum(), 8);
    const quiet = pattern(kickDrum(SAMPLE_RATE, 0.08), 12);
    const song = new Float64Array(loud.signal.length + quiet.signal.length);
    song.set(loud.signal);
    song.set(quiet.signal, loud.signal.length);
    const quietStart = loud.signal.length / SAMPLE_RATE;

    const missedAfterRecovery = missed(
      beatsIn(song),
      quiet.onsets.slice(2).map(onset => onset + quietStart),
    );

    expect(missedAfterRecovery).toEqual([]);
  });

  it('GIVEN hi-hats without bass WHEN analysed THEN any beat stays below the default gate', () => {
    // The abrupt burst start leaks a click into the bass bins; the Beat bar's threshold gates this out.
    const { signal } = pattern(hiHat(), 16, 0.25);

    expect(Math.max(0, ...beatsIn(signal).map(({ level }) => level))).toBeLessThan(0.2);
  });

  it.each([1, 2])('GIVEN kicks over a steady bass at %d x their level WHEN analysed THEN kicks still count', ratio => {
    const { signal, onsets } = pattern(kickDrum(), 32);
    const bass = tone(55, signal.length / SAMPLE_RATE, Math.min(0.8 * ratio, 1));

    expect(missed(beatsIn(mix(signal, bass)), onsets).length).toBeLessThanOrEqual(2);
  });

  it('GIVEN a bass ducked by each kick WHEN analysed THEN kicks still count', () => {
    const { signal, onsets } = pattern(kickDrum(), 32);
    const ducked = signal.map((sample, index) => {
      const seconds = index / SAMPLE_RATE;
      const sinceKick = seconds < LEAD_IN_S ? Number.POSITIVE_INFINITY : (seconds - LEAD_IN_S) % 0.5;
      return sample + 0.8 * (1 - Math.exp(-sinceKick / 0.06)) * Math.sin(2 * Math.PI * 55 * seconds);
    });

    const beats = beatsIn(ducked);

    expect(missed(beats, onsets).length).toBeLessThanOrEqual(2);
    expect(extra(beats, onsets).length).toBeLessThanOrEqual(2);
  });

  it('GIVEN a sudden level step on a steady tone WHEN analysed THEN it counts as one beat', () => {
    const quiet = tone(60, 2, 0.05);
    const loud = tone(60, 2, 0.8);
    const signal = new Float64Array(quiet.length + loud.length);
    signal.set(quiet);
    signal.set(loud, quiet.length);

    const beats = beatsIn(signal).filter(({ atSeconds }) => atSeconds >= 2);

    expect(beats).toHaveLength(1);
  });

  it('GIVEN a stream opened in the middle of music WHEN analysed THEN the first windows do not fire', () => {
    const beats = beatsIn(tone(60, 1));

    expect(beats).toEqual([]);
  });

  it('GIVEN hits faster than the refractory time WHEN analysed THEN they are capped, not lost', () => {
    const { signal } = pattern(kickDrum(), 25, 0.08);

    const count = beatsIn(signal).length;

    expect(count).toBeGreaterThanOrEqual(5);
    expect(count).toBeLessThanOrEqual(12);
  });
});
