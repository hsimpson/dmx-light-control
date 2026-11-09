import { describe, expect, it } from 'vitest';
import { BeatTempo } from './beat-tempo';

/** Pushes beats at the given times and returns the gap estimate after each one. */
const estimates = (times: number[]) => {
  const tempo = new BeatTempo();
  return times.map(time => tempo.push(time));
};

const steady = (gapMs: number, count: number, startMs = 0) =>
  Array.from({ length: count }, (_, index) => startMs + index * gapMs);

describe('BeatTempo', () => {
  it('GIVEN a first beat WHEN pushed THEN no gap is known yet', () => {
    expect(estimates([1000])).toEqual([undefined]);
  });

  it.each([
    ['50 BPM', 1200],
    ['120 BPM', 500],
    ['300 BPM', 200],
  ])('GIVEN steady beats at %s WHEN pushed THEN the gap is the beat interval', (_, gapMs) => {
    expect(estimates(steady(gapMs, 6))).toEqual([undefined, gapMs, gapMs, gapMs, gapMs, gapMs]);
  });

  it('GIVEN a steady tempo WHEN one kick is missed THEN the estimate stays on the beat interval', () => {
    const times = [...steady(500, 5), 3000, 3500];

    expect(estimates(times).slice(-2)).toEqual([500, 500]);
  });

  it('GIVEN a tempo change WHEN enough beats at the new tempo arrive THEN the estimate follows it', () => {
    const times = [...steady(500, 5), ...steady(300, 4, 2300)];

    expect(estimates(times).at(-1)).toBe(300);
  });

  it('GIVEN a break longer than 2 s WHEN the next beat comes THEN the history starts over', () => {
    const times = [...steady(500, 4), 3600, 4100];

    expect(estimates(times).slice(-2)).toEqual([undefined, 500]);
  });

  it('GIVEN a gap of exactly 2 s WHEN pushed THEN it still counts as a beat interval', () => {
    expect(estimates([0, 2000])).toEqual([undefined, 2000]);
    expect(estimates([0, 2001])).toEqual([undefined, undefined]);
  });

  it.each([
    ['backwards', -100],
    ['not at all', 0],
  ])('GIVEN the clock moves %s WHEN the next beat comes THEN the history starts over', (_, stepMs) => {
    const times = [...steady(500, 4), 1500 + stepMs, 2000 + stepMs];

    expect(estimates(times).slice(-2)).toEqual([undefined, 500]);
  });

  it.each([
    ['two gaps', [0, 500, 1500], 750],
    ['three gaps', [0, 300, 800, 1500], 500],
    ['four gaps', [0, 500, 1000, 1300, 1600], 400],
  ])('GIVEN %s of different length WHEN pushed THEN the median of them is returned', (_, times, median) => {
    expect(estimates(times).at(-1)).toBe(median);
  });

  it('GIVEN more than four gaps WHEN pushed THEN the oldest no longer counts', () => {
    expect(estimates([0, 1000, ...steady(500, 4, 1500)]).at(-1)).toBe(500);
  });

  it('GIVEN every third kick missed WHEN pushed THEN the estimate lengthens, as half the window is doubled gaps', () => {
    const times = steady(200, 12).filter((_, index) => index % 3 !== 2);

    expect(estimates(times).at(-1)).toBe(300);
  });
});
