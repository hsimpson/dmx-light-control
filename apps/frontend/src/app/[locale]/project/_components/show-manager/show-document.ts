import type { ShowFieldsFragment, UpdateShowInput } from '@/shared/types/graphql/graphql';

export type ShowDocument = ShowFieldsFragment;
export type ShowLightTrack = ShowDocument['lightTracks'][number];
export type ShowLightClip = ShowLightTrack['clips'][number];
export type ShowAudioClip = ShowDocument['audioClips'][number];

export const SHOW_DEFAULT_CLIP_MS = 8000;
export const SHOW_MIN_CLIP_MS = 100;
/** Same rate as the backend's waveform peaks (`WAVEFORM_PEAKS_PER_SECOND`). */
export const SHOW_PEAKS_PER_SECOND = 20;

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;

export const createLightTrack = (name: string): ShowLightTrack => ({ id: crypto.randomUUID(), name, clips: [] });

export const createLightClip = (functionPublicId: string, startMs: number): ShowLightClip => ({
  id: crypto.randomUUID(),
  functionPublicId,
  startMs: Math.max(0, Math.round(startMs)),
  durationMs: SHOW_DEFAULT_CLIP_MS,
  followBeat: true,
});

export const addLightTrack = (show: ShowDocument, name: string): ShowDocument => ({
  ...show,
  lightTracks: [...show.lightTracks, createLightTrack(name)],
});

export const removeLightTrack = (show: ShowDocument, trackId: string): ShowDocument => ({
  ...show,
  lightTracks: show.lightTracks.filter(track => track.id !== trackId),
});

export const addLightClip = (show: ShowDocument, trackId: string, clip: ShowLightClip): ShowDocument => ({
  ...show,
  lightTracks: show.lightTracks.map(track =>
    track.id === trackId ? { ...track, clips: [...track.clips, clip] } : track,
  ),
});

export const updateLightClip = (show: ShowDocument, clipId: string, patch: Partial<ShowLightClip>): ShowDocument => ({
  ...show,
  lightTracks: show.lightTracks.map(track => ({
    ...track,
    clips: track.clips.map(clip => (clip.id === clipId ? { ...clip, ...patch } : clip)),
  })),
});

export const removeLightClip = (show: ShowDocument, clipId: string): ShowDocument => ({
  ...show,
  lightTracks: show.lightTracks.map(track => ({ ...track, clips: track.clips.filter(clip => clip.id !== clipId) })),
});

export const moveAudioClip = (show: ShowDocument, publicId: string, startMs: number): ShowDocument => ({
  ...show,
  audioClips: show.audioClips.map(clip =>
    clip.publicId === publicId ? { ...clip, startMs: Math.max(0, Math.round(startMs)) } : clip,
  ),
});

export const findLightClip = (show: ShowDocument, clipId: string | null): ShowLightClip | undefined =>
  show.lightTracks.flatMap(track => track.clips).find(clip => clip.id === clipId);

/** Beats on the show timeline: each audio clip's beats shifted by its (possibly moved) start; ascending. */
export const showBeatsMs = (show: ShowDocument): number[] =>
  show.audioClips.flatMap(clip => clip.beatsMs.map(beat => clip.startMs + beat)).sort((a, b) => a - b);

/** End of the last clip; same as the backend's `showDurationMs`. */
export const showDurationMs = (show: ShowDocument): number =>
  Math.max(
    0,
    ...show.audioClips.map(clip => clip.startMs + clip.durationMs),
    ...show.lightTracks.flatMap(track => track.clips.map(clip => clip.startMs + clip.durationMs)),
  );

export const audioClipsOverlap = (show: ShowDocument): boolean => {
  const sorted = [...show.audioClips].sort((a, b) => a.startMs - b.startMs);
  return sorted.some((clip, index) => {
    const next = sorted[index + 1];
    return next !== undefined && clip.startMs + clip.durationMs > next.startMs;
  });
};

/** The nearest beat within `toleranceMs`, else `ms` unchanged; lets clip edges lock onto the grid. */
export const snapToBeat = (ms: number, beatsMs: readonly number[], toleranceMs: number): number => {
  const nearest = beatsMs.reduce<number | null>(
    (best, beat) => (best === null || Math.abs(beat - ms) < Math.abs(best - ms) ? beat : best),
    null,
  );
  return nearest !== null && Math.abs(nearest - ms) <= toleranceMs ? nearest : ms;
};

/** `m:ss`, the precision a show transport needs. */
export const formatShowTime = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / MS_PER_SECOND));
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

/** Built field by field: Apollo results carry `__typename`, which the input types reject. */
export const toUpdateShowInput = (show: ShowDocument): UpdateShowInput => ({
  publicId: show.publicId,
  name: show.name,
  lightTracks: show.lightTracks.map(track => ({
    id: track.id,
    name: track.name,
    clips: track.clips.map(({ id, functionPublicId, startMs, durationMs, followBeat }) => ({
      id,
      functionPublicId,
      startMs,
      durationMs,
      followBeat,
    })),
  })),
  audioClips: show.audioClips.map(({ publicId, startMs }) => ({ publicId, startMs })),
});
