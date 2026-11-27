import { describe, expect, it } from 'vitest';
import { audioClipsOverlap, removeFunctionClips, showBeatsMs, showDurationMs, ShowLightTrack } from './show';

const clip = (startMs: number, durationMs: number, beatsMs: number[] = []) => ({ startMs, durationMs, beatsMs });

const track = (clips: [string, number, number][]): ShowLightTrack => ({
  id: 't',
  name: 'Track',
  clips: clips.map(([functionPublicId, startMs, durationMs], index) => ({
    id: `c${index}`,
    functionPublicId,
    startMs,
    durationMs,
    followBeat: true,
  })),
});

describe('showBeatsMs', () => {
  it('GIVEN clips out of order WHEN merged THEN beats move by each clip start and are sorted', () => {
    expect(showBeatsMs([clip(10000, 1000, [0, 500]), clip(0, 1000, [100, 600])])).toEqual([100, 600, 10000, 10500]);
  });
});

describe('showDurationMs', () => {
  it('GIVEN audio and light clips WHEN measured THEN the latest end wins', () => {
    expect(showDurationMs([clip(0, 3000)], [track([['f', 2000, 1500]])])).toBe(3500);
  });

  it('GIVEN an empty show WHEN measured THEN it lasts 0 ms', () => {
    expect(showDurationMs([], [])).toBe(0);
  });
});

describe('audioClipsOverlap', () => {
  it('GIVEN clips that touch WHEN checked THEN they do not overlap', () => {
    expect(audioClipsOverlap([clip(1000, 1000), clip(0, 1000)])).toBe(false);
  });

  it('GIVEN a clip starting inside another WHEN checked THEN they overlap', () => {
    expect(audioClipsOverlap([clip(0, 1000), clip(999, 1000)])).toBe(true);
  });
});

describe('removeFunctionClips', () => {
  it('GIVEN clips of two functions WHEN one is removed THEN only its clips go and tracks stay', () => {
    const result = removeFunctionClips(
      [
        track([
          ['a', 0, 100],
          ['b', 0, 100],
        ]),
      ],
      'a',
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.clips.map(c => c.functionPublicId)).toEqual(['b']);
  });
});
