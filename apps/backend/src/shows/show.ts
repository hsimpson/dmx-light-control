/** A function placed on a light track; `followBeat` steps it on every beat of the show instead of free-running. */
export type ShowLightClip = {
  id: string;
  functionPublicId: string;
  startMs: number;
  durationMs: number;
  followBeat: boolean;
};

export type ShowLightTrack = { id: string; name: string; clips: ShowLightClip[] };

export type ShowAudioClipTiming = { startMs: number; durationMs: number; beatsMs: number[] };

/** Every audio clip's beats on the show's timeline, ascending. */
export function showBeatsMs(audioClips: readonly ShowAudioClipTiming[]): number[] {
  return audioClips.flatMap(clip => clip.beatsMs.map(beat => clip.startMs + beat)).sort((a, b) => a - b);
}

/** End of the last audio or light clip. */
export function showDurationMs(
  audioClips: readonly ShowAudioClipTiming[],
  lightTracks: readonly ShowLightTrack[],
): number {
  const ends = [
    ...audioClips.map(clip => clip.startMs + clip.durationMs),
    ...lightTracks.flatMap(track => track.clips.map(clip => clip.startMs + clip.durationMs)),
  ];
  return Math.max(0, ...ends);
}

/** The single audio track plays one clip at a time. */
export function audioClipsOverlap(audioClips: readonly ShowAudioClipTiming[]): boolean {
  const sorted = [...audioClips].sort((a, b) => a.startMs - b.startMs);
  return sorted.some((clip, index) => {
    const next = sorted[index + 1];
    return next !== undefined && clip.startMs + clip.durationMs > next.startMs;
  });
}

export function removeFunctionClips(
  lightTracks: readonly ShowLightTrack[],
  functionPublicId: string,
): ShowLightTrack[] {
  return lightTracks.map(track => ({
    ...track,
    clips: track.clips.filter(clip => clip.functionPublicId !== functionPublicId),
  }));
}

export function clipFunctionIds(lightTracks: readonly ShowLightTrack[]): Set<string> {
  return new Set(lightTracks.flatMap(track => track.clips.map(clip => clip.functionPublicId)));
}
