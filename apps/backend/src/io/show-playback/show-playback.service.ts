import { AppEventEmitter } from '@/events/app-event-emitter';
import { AUDIO_BYTES_PER_FRAME, AUDIO_SAMPLE_RATE } from '@/io/audio-file/decode-audio';
import { AUDIO_OUTPUT_FRAMES, AudioOutputService } from '@/io/audio-output/audio-output.service';
import { errorMessage } from '@/io/rt-audio';
import { LoadedShow, ShowRepository } from '@/shows/repositories/show.repository';
import { ShowAudioService } from '@/shows/show-audio.service';
import { showBeatsMs, showDurationMs } from '@/shows/show';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { closeSync, fstatSync, openSync, readSync } from 'node:fs';
import { ShowClock } from './show-clock';
import { ShowPlaybackStatus } from './show-events';
import { PcmClip, showPcm } from './show-pcm';
import {
  ActiveFunction,
  ActiveFunctions,
  activeFunctions,
  beatCount,
  beatsBetween,
  diffActive,
  functionsSteppedAt,
} from './show-timeline';

const TICK_MS = 25;
const STATE_INTERVAL_MS = 100;

type Session = {
  show: LoadedShow;
  beatsMs: number[];
  durationMs: number;
  clips: PcmClip[];
  active: ActiveFunctions;
  /** Functions this show started; one the console already ran is left to the console. */
  claimed: Set<string>;
  positionMs: number;
  audioAttached: boolean;
};

/** Plays one show at a time: its audio on the project's audio output, its clips through function playback. */
@Injectable()
export class ShowPlaybackService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ShowPlaybackService.name);
  private readonly clock = new ShowClock();
  private session: Session | null = null;
  private status: ShowPlaybackStatus = 'stopped';
  private running = new Set<string>();
  private timer: ReturnType<typeof setInterval> | undefined;
  private lastStateAt = 0;
  // Bumped by every play and stop: a show that finishes loading after a newer request must not start.
  private playToken = 0;

  public constructor(
    private readonly showRepository: ShowRepository,
    private readonly showAudio: ShowAudioService,
    private readonly audioOutput: AudioOutputService,
    private readonly eventEmitter: AppEventEmitter,
  ) {}

  public onModuleInit(): void {
    this.eventEmitter.on('show.play', ({ showPublicId, fromMs }) => {
      this.play(showPublicId, fromMs).catch((err: unknown) => {
        this.logger.error(`Show ${showPublicId} could not start: ${errorMessage(err)}`);
      });
    });
    this.eventEmitter.on('show.pause', () => {
      this.pause();
    });
    this.eventEmitter.on('show.stop', () => {
      this.stop();
    });
    this.eventEmitter.on('show.state.request', () => {
      this.emitState();
    });
    this.eventEmitter.on('function.state', ({ running }) => {
      this.running = new Set(running);
    });
  }

  public onModuleDestroy(): void {
    this.stop();
  }

  public async play(showPublicId: string, fromMs?: number): Promise<void> {
    if (this.status === 'paused' && this.session?.show.publicId === showPublicId && fromMs === undefined) {
      this.startAt(this.session, this.session.positionMs);
      return;
    }
    this.stop();
    const token = this.playToken;
    const show = await this.showRepository.findLoadedByPublicId(showPublicId);
    if (token !== this.playToken) return;
    if (!show) {
      this.logger.warn(`Show ${showPublicId} not found`);
      return;
    }
    this.session = this.open(show);
    this.startAt(this.session, Math.min(fromMs ?? 0, this.session.durationMs));
  }

  public pause(): void {
    const session = this.session;
    if (this.status !== 'playing' || !session) return;
    session.positionMs = this.clock.positionMs();
    this.halt(session);
    this.status = 'paused';
    this.emitState();
  }

  public stop(): void {
    this.playToken++;
    const session = this.session;
    if (!session) return;
    this.halt(session);
    for (const clip of session.clips) closeSync(clip.fd);
    this.session = null;
    this.status = 'stopped';
    this.emitState();
  }

  private open(show: LoadedShow): Session {
    return {
      show,
      beatsMs: showBeatsMs(show.audioClips),
      durationMs: showDurationMs(show.audioClips, show.lightTracks),
      clips: show.audioClips.flatMap(clip => this.openClip(show, clip)),
      active: new Map(),
      claimed: new Set(),
      positionMs: 0,
      audioAttached: false,
    };
  }

  // A missing file plays as silence: the lights must still run.
  private openClip(show: LoadedShow, clip: LoadedShow['audioClips'][number]): PcmClip[] {
    if (!show.publicId || !clip.publicId) return [];
    let fd: number | undefined;
    try {
      fd = openSync(this.showAudio.clipPath(show.publicId, clip.publicId), 'r');
      const frames = Math.floor(fstatSync(fd).size / AUDIO_BYTES_PER_FRAME);
      return [{ fd, frames, startFrame: msToFrames(clip.startMs) }];
    } catch (err) {
      if (fd !== undefined) closeSync(fd);
      this.logger.warn(`Audio of clip ${clip.publicId} unavailable: ${errorMessage(err)}`);
      return [];
    }
  }

  private startAt(session: Session, positionMs: number): void {
    session.positionMs = positionMs;
    this.clock.start(positionMs);
    this.status = 'playing';
    this.timer ??= setInterval(() => {
      this.tick();
    }, TICK_MS);
    this.tick();
    this.emitState();
  }

  /** Stops time, sound and the show's functions; the position stays. */
  private halt(session: Session): void {
    clearInterval(this.timer);
    this.timer = undefined;
    this.detachAudio(session);
    for (const id of session.claimed) this.eventEmitter.emit('function.stop', { functionPublicId: id });
    session.claimed.clear();
    session.active = new Map();
  }

  private tick(): void {
    const session = this.session;
    if (this.status !== 'playing' || !session) return;
    this.syncAudio(session);
    const positionMs = this.clock.positionMs();
    if (positionMs >= session.durationMs) {
      this.stop();
      return;
    }
    const started = this.applyFunctions(session, positionMs);
    this.applyBeats(session, positionMs, started);
    session.positionMs = positionMs;
    if (positionMs - this.lastStateAt >= STATE_INTERVAL_MS) this.emitState();
  }

  private applyFunctions(session: Session, positionMs: number): Set<string> {
    const next = activeFunctions(session.show.lightTracks, positionMs);
    const { stop, start } = diffActive(session.active, next);
    for (const id of stop) {
      if (session.claimed.delete(id)) this.eventEmitter.emit('function.stop', { functionPublicId: id });
    }
    const started = new Set(start.filter(id => this.claim(session, id, next.get(id), positionMs)));
    session.active = next;
    return started;
  }

  /** Starts a function for the show unless the console already runs it. */
  private claim(session: Session, id: string, active: ActiveFunction | undefined, positionMs: number): boolean {
    if (!active || this.running.has(id)) return false;
    session.claimed.add(id);
    // Seeking into a clip starts it on the step it would have reached; the beat count already covers this tick.
    const beats = active.stepped ? beatCount(session.beatsMs, active.beatsFromMs, positionMs) : 0;
    this.eventEmitter.emit('function.start', { functionPublicId: id, stepped: active.stepped, beats });
    return true;
  }

  private applyBeats(session: Session, positionMs: number, started: Set<string>): void {
    for (const beatMs of beatsBetween(session.beatsMs, session.positionMs, positionMs)) {
      for (const id of functionsSteppedAt(session.show.lightTracks, beatMs)) {
        if (session.claimed.has(id) && !started.has(id)) {
          this.eventEmitter.emit('function.step', { functionPublicId: id });
        }
      }
    }
  }

  /** Follows the output: audio clock while it is open, wall clock while not, also when it comes or goes mid-show. */
  private syncAudio(session: Session): void {
    const open = this.audioOutput.openHandle() !== null;
    if (open && !session.audioAttached) this.attachAudio(session);
    if (!open && session.audioAttached) this.detachAudio(session);
  }

  private attachAudio(session: Session): void {
    const startFrame = msToFrames(this.clock.positionMs());
    this.clock.attachAudio(this.clock.positionMs());
    this.audioOutput.setSource(() => {
      const pcm = showPcm(session.clips, startFrame + this.clock.pulledFrames(), AUDIO_OUTPUT_FRAMES, readSync);
      this.clock.onPulled(AUDIO_OUTPUT_FRAMES);
      return pcm;
    });
    session.audioAttached = true;
  }

  private detachAudio(session: Session): void {
    if (!session.audioAttached) return;
    this.audioOutput.setSource(null);
    this.clock.detachAudio();
    session.audioAttached = false;
  }

  private emitState(): void {
    const session = this.session;
    const positionMs = session ? Math.round(session.positionMs) : 0;
    this.lastStateAt = positionMs;
    this.eventEmitter.emit('show.state', {
      showPublicId: session?.show.publicId ?? null,
      status: this.status,
      positionMs,
      durationMs: session?.durationMs ?? 0,
    });
  }
}

function msToFrames(ms: number): number {
  return Math.round((ms * AUDIO_SAMPLE_RATE) / 1000);
}
