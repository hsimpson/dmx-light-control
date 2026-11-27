import { AUDIO_SAMPLE_RATE } from '@/io/audio-file/decode-audio';
import { AUDIO_OUTPUT_FRAMES, AUDIO_OUTPUT_QUEUED_BUFFERS } from '@/io/audio-output/audio-output.service';

const BUFFER_MS = (AUDIO_OUTPUT_FRAMES / AUDIO_SAMPLE_RATE) * 1000;
const QUEUED_FRAMES = AUDIO_OUTPUT_QUEUED_BUFFERS * AUDIO_OUTPUT_FRAMES;

/**
 * Show position in ms. With audio it follows the frames the output pulled (the device clock), minus the buffers
 * still queued in front of them, interpolated between pulls; without audio it follows the wall clock.
 * It never runs backwards, so beats are never sent twice.
 */
export class ShowClock {
  private originMs = 0;
  private anchorAt = 0;
  private audio = false;
  private pulled = 0;
  private lastPullAt = 0;
  private last = 0;

  public constructor(private readonly now: () => number = () => Date.now()) {}

  public start(positionMs: number): void {
    this.originMs = positionMs;
    this.anchorAt = this.now();
    this.audio = false;
    this.last = positionMs;
  }

  public attachAudio(positionMs: number): void {
    this.start(positionMs);
    this.audio = true;
    this.pulled = 0;
  }

  public detachAudio(): void {
    this.start(this.positionMs());
  }

  public pulledFrames(): number {
    return this.pulled;
  }

  public onPulled(frames: number): void {
    this.pulled += frames;
    this.lastPullAt = this.now();
  }

  public positionMs(): number {
    this.last = Math.max(this.last, this.audio ? this.audioPositionMs() : this.originMs + this.now() - this.anchorAt);
    return this.last;
  }

  private audioPositionMs(): number {
    const played = this.pulled - QUEUED_FRAMES;
    if (played <= 0) return this.originMs;
    // Pulls come every ~21 ms; interpolating keeps the 25 ms tick from jittering against them.
    return this.originMs + (played / AUDIO_SAMPLE_RATE) * 1000 + Math.min(this.now() - this.lastPullAt, BUFFER_MS);
  }
}
