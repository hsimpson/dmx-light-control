import type { ShowLightTrack } from '@/shows/show';

/**
 * A function with at least one clip under the playhead. Overlapping clips of one function share one runner;
 * it follows the beat if any of them does, counting beats from the earliest of those clips.
 */
export type ActiveFunction = { stepped: boolean; clipIds: Set<string>; beatsFromMs: number };

export type ActiveFunctions = Map<string, ActiveFunction>;

export function activeFunctions(lightTracks: readonly ShowLightTrack[], positionMs: number): ActiveFunctions {
  const active: ActiveFunctions = new Map();
  for (const clip of lightTracks.flatMap(track => track.clips)) {
    if (positionMs < clip.startMs || positionMs >= clip.startMs + clip.durationMs) continue;
    const entry = active.get(clip.functionPublicId) ?? { stepped: false, clipIds: new Set(), beatsFromMs: Infinity };
    entry.clipIds.add(clip.id);
    if (clip.followBeat) {
      entry.stepped = true;
      entry.beatsFromMs = Math.min(entry.beatsFromMs, clip.startMs);
    }
    active.set(clip.functionPublicId, entry);
  }
  return active;
}

/**
 * What to stop and start to get from `previous` to `next`. A function restarts when its mode changes or when none
 * of its previous clips is still playing (back-to-back clips start the sequence over).
 */
export function diffActive(previous: ActiveFunctions, next: ActiveFunctions): { stop: string[]; start: string[] } {
  const restarts = (id: string, before: ActiveFunction) => {
    const after = next.get(id);
    const continues = [...before.clipIds].some(clipId => after?.clipIds.has(clipId));
    return after?.stepped !== before.stepped || !continues;
  };
  const stop = [...previous].filter(([id, before]) => restarts(id, before)).map(([id]) => id);
  const start = [...next.keys()].filter(id => !previous.has(id) || stop.includes(id));
  return { stop, start };
}

/** Number of beats in [fromMs, toMs]; `beatsMs` is ascending. */
export function beatCount(beatsMs: readonly number[], fromMs: number, toMs: number): number {
  return beatsMs.filter(beat => beat >= fromMs && beat <= toMs).length;
}

/** Beats in (fromMs, toMs]; `beatsMs` is ascending. */
export function beatsBetween(beatsMs: readonly number[], fromMs: number, toMs: number): number[] {
  return beatsMs.filter(beat => beat > fromMs && beat <= toMs);
}

/** Functions a beat at `beatMs` steps: those with a follow-beat clip covering it. */
export function functionsSteppedAt(lightTracks: readonly ShowLightTrack[], beatMs: number): Set<string> {
  return new Set(
    lightTracks
      .flatMap(track => track.clips)
      .filter(clip => clip.followBeat && beatMs >= clip.startMs && beatMs < clip.startMs + clip.durationMs)
      .map(clip => clip.functionPublicId),
  );
}
