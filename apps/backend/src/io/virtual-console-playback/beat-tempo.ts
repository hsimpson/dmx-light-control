/** Enough gaps that one missed kick (a doubled gap) does not move the median. */
const GAP_COUNT = 4;
/** A longer gap (below 30 BPM, or one missed kick below 60 BPM) is a break: the next beats start a new estimate. */
const MAX_GAP_MS = 2000;

/** Estimates the time between beats from when they arrived. */
export class BeatTempo {
  private readonly gaps: number[] = [];
  private lastBeatMs: number | undefined;

  /** Records a beat; returns the median of the recent gaps, or undefined while none is known. */
  public push(nowMs: number): number | undefined {
    const gap = this.lastBeatMs === undefined ? undefined : nowMs - this.lastBeatMs;
    this.lastBeatMs = nowMs;
    if (gap === undefined) return undefined;
    // A clock that went backwards or stood still gives no usable gap either.
    if (gap <= 0 || gap > MAX_GAP_MS) {
      this.gaps.length = 0;
      return undefined;
    }
    this.gaps.push(gap);
    if (this.gaps.length > GAP_COUNT) this.gaps.shift();
    const sorted = [...this.gaps].sort((left, right) => left - right);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 1 ? sorted[middle] : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
  }
}
