import { describe, expect, it } from 'vitest';
import {
  addCue,
  addLightClip,
  addLightTrack,
  audioClipsOverlap,
  createLightClip,
  cueAt,
  formatShowTime,
  moveAudioClip,
  removeCue,
  removeLightClip,
  showBeatsMs,
  showDurationMs,
  snapToBeat,
  toUpdateShowInput,
  updateCue,
  updateLightClip,
  type ShowDocument,
} from './show-document';

const audioClip = (publicId: string, startMs: number, durationMs: number, beatsMs: number[] = []) => ({
  publicId,
  fileName: `${publicId}.mp3`,
  startMs,
  durationMs,
  beatsMs,
  peaks: [],
});

const emptyShow = (): ShowDocument => ({
  publicId: 'show-1',
  name: 'Opening',
  durationMs: 0,
  beatsMs: [],
  audioClips: [],
  lightTracks: [],
  cues: [],
});

describe('show document', () => {
  it('GIVEN a track WHEN a clip is added, changed and removed THEN only that clip changes', () => {
    const withTrack = addLightTrack(emptyShow(), 'Front');
    const trackId = withTrack.lightTracks[0]?.id ?? '';
    const clip = createLightClip('fn-1', 1234.6);

    const added = addLightClip(withTrack, trackId, clip);
    const changed = updateLightClip(added, clip.id, { followBeat: false, durationMs: 500 });
    const removed = removeLightClip(changed, clip.id);

    expect(added.lightTracks[0]?.clips[0]).toMatchObject({ functionPublicId: 'fn-1', startMs: 1235, followBeat: true });
    expect(changed.lightTracks[0]?.clips[0]).toMatchObject({ followBeat: false, durationMs: 500 });
    expect(removed.lightTracks[0]?.clips).toEqual([]);
  });

  it('GIVEN a show WHEN a cue is added, moved, renamed and removed THEN only that cue changes', () => {
    const withCues = addCue(addCue(emptyShow(), 1000.4, 'Intro'), 5000, 'Chorus');
    const id = withCues.cues[0]?.id ?? '';

    const changed = updateCue(withCues, id, { ms: 2000, name: 'Verse' });
    const removed = removeCue(changed, id);

    expect(withCues.cues.map(cue => [cue.name, cue.ms])).toEqual([
      ['Intro', 1000],
      ['Chorus', 5000],
    ]);
    expect(changed.cues[0]).toMatchObject({ name: 'Verse', ms: 2000 });
    expect(removed.cues.map(cue => cue.name)).toEqual(['Chorus']);
  });

  it('GIVEN a moved audio clip WHEN beats are listed THEN they move with it and stay sorted', () => {
    const show = { ...emptyShow(), audioClips: [audioClip('a', 0, 1000, [100, 600]), audioClip('b', 2000, 1000, [0])] };

    expect(showBeatsMs(moveAudioClip(show, 'b', 300))).toEqual([100, 300, 600]);
  });

  it('GIVEN audio and light clips WHEN measured THEN the duration is the latest end and overlap is detected', () => {
    const show = addLightClip(addLightTrack(emptyShow(), 'Front'), '', createLightClip('fn', 0));
    const withAudio = {
      ...addLightClip(show, show.lightTracks[0]?.id ?? '', { ...createLightClip('fn', 9000), durationMs: 2000 }),
      audioClips: [audioClip('a', 0, 4000), audioClip('b', 3000, 1000)],
    };

    expect(showDurationMs(withAudio)).toBe(11000);
    expect(audioClipsOverlap(withAudio)).toBe(true);
    expect(audioClipsOverlap(moveAudioClip(withAudio, 'b', 4000))).toBe(false);
  });

  it.each([
    [480, 500],
    [530, 500],
    [560, 560],
  ])('GIVEN beats every 500 ms WHEN %i ms snaps within 50 ms THEN it becomes %i', (ms, snapped) => {
    expect(snapToBeat(ms, [0, 500, 1000], 50)).toBe(snapped);
  });

  it.each([
    [0, '0:00'],
    [59_999, '0:59'],
    [61_000, '1:01'],
    [600_000, '10:00'],
  ])('GIVEN %i ms WHEN formatted THEN it reads %s', (ms, text) => {
    expect(formatShowTime(ms)).toBe(text);
  });

  it('GIVEN a loaded show with typenames WHEN turned into input THEN only input fields remain', () => {
    const loaded = {
      ...emptyShow(),
      __typename: 'ShowDto',
      audioClips: [{ ...audioClip('a', 500, 1000, [10]), __typename: 'ShowAudioClipDto' }],
      cues: [{ __typename: 'ShowCueDto', id: 'q', name: 'Drop', ms: 700 }],
      lightTracks: [
        {
          __typename: 'ShowLightTrackDto',
          id: 't',
          name: 'Front',
          clips: [
            {
              __typename: 'ShowLightClipDto',
              id: 'c',
              functionPublicId: 'fn',
              startMs: 0,
              durationMs: 100,
              followBeat: false,
            },
          ],
        },
      ],
    };

    expect(toUpdateShowInput(loaded)).toEqual({
      publicId: 'show-1',
      name: 'Opening',
      lightTracks: [
        {
          id: 't',
          name: 'Front',
          clips: [{ id: 'c', functionPublicId: 'fn', startMs: 0, durationMs: 100, followBeat: false }],
        },
      ],
      audioClips: [{ publicId: 'a', startMs: 500 }],
      cues: [{ id: 'q', name: 'Drop', ms: 700 }],
    });
  });

  it('GIVEN sorted cues WHEN asked at a time THEN it returns the cue last passed and the next one', () => {
    const cues = [
      { id: 'a', name: 'Verse', ms: 1000 },
      { id: 'b', name: 'Chorus', ms: 5000 },
    ];

    expect(cueAt(cues, 500)).toEqual({ current: undefined, next: cues[0] });
    expect(cueAt(cues, 1000)).toEqual({ current: cues[0], next: cues[1] });
    expect(cueAt(cues, 9000)).toEqual({ current: cues[1], next: undefined });
  });
});
