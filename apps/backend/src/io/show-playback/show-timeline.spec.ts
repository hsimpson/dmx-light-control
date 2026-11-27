import type { ShowLightTrack } from '@/shows/show';
import { describe, expect, it } from 'vitest';
import { activeFunctions, beatCount, beatsBetween, diffActive, functionsSteppedAt } from './show-timeline';

type ClipSpec = [id: string, fn: string, startMs: number, durationMs: number, followBeat: boolean];

const tracks = (...clips: ClipSpec[]): ShowLightTrack[] => [
  {
    id: 't',
    name: 'Track',
    clips: clips.map(([id, functionPublicId, startMs, durationMs, followBeat]) => ({
      id,
      functionPublicId,
      startMs,
      durationMs,
      followBeat,
    })),
  },
];

describe('activeFunctions', () => {
  it('GIVEN overlapping clips of one function WHEN one follows the beat THEN the shared runner is stepped from its start', () => {
    const lightTracks = tracks(['a', 'f', 0, 2000, false], ['b', 'f', 500, 2000, true]);

    const active = activeFunctions(lightTracks, 1000);

    expect(active.get('f')).toEqual({ stepped: true, clipIds: new Set(['a', 'b']), beatsFromMs: 500 });
  });

  it('GIVEN a clip WHEN the playhead is at its end THEN it is no longer active', () => {
    expect(activeFunctions(tracks(['a', 'f', 0, 1000, false]), 1000).size).toBe(0);
  });
});

describe('diffActive', () => {
  it('GIVEN a clip handing over to an overlapping one WHEN diffed THEN the function keeps running', () => {
    const lightTracks = tracks(['a', 'f', 0, 1000, false], ['b', 'f', 500, 1000, false]);

    expect(diffActive(activeFunctions(lightTracks, 900), activeFunctions(lightTracks, 1100))).toEqual({
      stop: [],
      start: [],
    });
  });

  it('GIVEN back-to-back clips of one function WHEN the second begins THEN the function restarts', () => {
    const lightTracks = tracks(['a', 'f', 0, 1000, false], ['b', 'f', 1000, 1000, false]);

    expect(diffActive(activeFunctions(lightTracks, 990), activeFunctions(lightTracks, 1010))).toEqual({
      stop: ['f'],
      start: ['f'],
    });
  });

  it('GIVEN a free clip joined by a beat clip WHEN diffed THEN the function restarts stepped', () => {
    const lightTracks = tracks(['a', 'f', 0, 2000, false], ['b', 'f', 1000, 1000, true]);

    expect(diffActive(activeFunctions(lightTracks, 900), activeFunctions(lightTracks, 1000))).toEqual({
      stop: ['f'],
      start: ['f'],
    });
  });

  it('GIVEN clips ending and beginning WHEN diffed THEN ended ones stop and new ones start', () => {
    const lightTracks = tracks(['a', 'f', 0, 1000, false], ['b', 'g', 1000, 1000, false]);

    expect(diffActive(activeFunctions(lightTracks, 500), activeFunctions(lightTracks, 1500))).toEqual({
      stop: ['f'],
      start: ['g'],
    });
  });
});

describe('beats', () => {
  const beatsMs = [0, 500, 1000, 1500];

  it('GIVEN beats WHEN counted from a clip start to the playhead THEN both ends count', () => {
    expect(beatCount(beatsMs, 500, 1000)).toBe(2);
  });

  it('GIVEN a tick WHEN beats are collected THEN the previous position is excluded and the new one included', () => {
    expect(beatsBetween(beatsMs, 500, 1000)).toEqual([1000]);
  });

  it('GIVEN a beat WHEN looking for functions to step THEN only follow-beat clips covering it count', () => {
    const lightTracks = tracks(['a', 'f', 0, 1000, true], ['b', 'g', 0, 1000, false], ['c', 'h', 1000, 500, true]);

    expect(functionsSteppedAt(lightTracks, 500)).toEqual(new Set(['f']));
  });
});
