import { AppEventEmitter } from '@/events/app-event-emitter';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { RtAudio, RtAudioApi, RtAudioErrorType, RtAudioFormat, RtAudioStreamFlags } from 'audify';
import { FFT_HOP, monoSamples, SpectrumAnalyser } from './spectrum';

export type SoundInputChannels = 1 | 2;
export type SoundInputTarget = { handle: string; channels: SoundInputChannels };
export type SoundInputDevice = { name: string; maxInputChannels: number };

const FRAMES_PER_BUFFER = FFT_HOP;
const FALLBACK_SAMPLE_RATE = 48000;
const LEVEL_INTERVAL_MS = 50;
const INT16_FULL_SCALE = 32768;
const BYTES_PER_SAMPLE = 2;

/** Captures the project's single sound input and emits its per-channel peak level. */
@Injectable()
export class SoundInputService implements OnModuleDestroy {
  private readonly logger = new Logger(SoundInputService.name);
  private readonly rtAudio = createRtAudio();
  private current: SoundInputTarget | null = null;
  private peaks: number[] = [];
  private analyser = new SpectrumAnalyser(FALLBACK_SAMPLE_RATE);
  private lastEmit = 0;

  public constructor(private readonly eventEmitter: AppEventEmitter) {
    if (!this.rtAudio) this.logger.warn('Audio backend unavailable: sound inputs are disabled');
  }

  public onModuleDestroy(): void {
    this.sync(null);
  }

  public listInputs(): SoundInputDevice[] {
    return (this.rtAudio?.getDevices() ?? [])
      .filter(device => device.inputChannels > 0)
      .map(device => ({ name: device.name, maxInputChannels: device.inputChannels }));
  }

  public openHandle(): string | null {
    return this.current?.handle ?? null;
  }

  /** Opens `target`, reopening when device or channel count changed; null closes the stream. */
  // Never throws: a native failure here must not break the device manager's reconcile loop.
  public sync(target: SoundInputTarget | null): void {
    if (target && this.current?.handle === target.handle && this.current.channels === target.channels) return;
    try {
      this.close();
      if (target && this.rtAudio) this.open(this.rtAudio, target);
    } catch (err) {
      this.logger.error(`Sound input sync failed: ${errorMessage(err)}`);
      this.current = null;
    }
  }

  private open(rtAudio: RtAudio, target: SoundInputTarget): void {
    // Device ids shift when devices come and go, so the name is resolved on every open.
    const device = rtAudio.getDevices().find(candidate => candidate.name === target.handle);
    if (!device) {
      this.logger.warn(`Sound input ${JSON.stringify(target.handle)} is not available`);
      return;
    }
    // A mono-only device configured as stereo still captures, in mono.
    const channels = Math.min(target.channels, device.inputChannels);
    const sampleRate = device.preferredSampleRate || FALLBACK_SAMPLE_RATE;
    try {
      rtAudio.openStream(
        null,
        { deviceId: device.id, nChannels: channels },
        RtAudioFormat.RTAUDIO_SINT16,
        sampleRate,
        FRAMES_PER_BUFFER,
        'dmx-light-control',
        pcm => {
          this.onInput(pcm, channels);
        },
        null,
        RtAudioStreamFlags.RTAUDIO_MINIMIZE_LATENCY,
        (type, message) => {
          this.onStreamError(type, message);
        },
      );
      rtAudio.start();
    } catch (err) {
      this.logger.error(`Failed to open sound input ${JSON.stringify(target.handle)}: ${errorMessage(err)}`);
      this.closeStream();
      return;
    }
    this.current = target;
    this.analyser = new SpectrumAnalyser(sampleRate);
    this.peaks = [];
    this.logger.log(`Opened sound input ${JSON.stringify(target.handle)} (${channels} channel(s))`);
  }

  private close(): void {
    if (!this.current) return;
    const { handle, channels } = this.current;
    this.current = null;
    this.closeStream();
    this.logger.log(`Closed sound input ${JSON.stringify(handle)}`);
    // Drops the meter to silence instead of freezing it at the last peak.
    this.eventEmitter.emit('soundInput.level', { levels: Array.from({ length: channels }, () => 0) });
    this.eventEmitter.emit('soundInput.spectrum', { power: [], sampleRate: 0, meanSquare: 0 });
  }

  private closeStream(): void {
    if (this.rtAudio?.isStreamOpen()) this.rtAudio.closeStream();
  }

  private onInput(pcm: Buffer, channels: number): void {
    const levels = peakLevels(pcm, channels);
    this.peaks = levels.map((level, channel) => Math.max(level, this.peaks[channel] ?? 0));
    this.analyser.push(monoSamples(pcm, channels));
    const now = Date.now();
    if (now - this.lastEmit < LEVEL_INTERVAL_MS) return;
    this.lastEmit = now;
    this.eventEmitter.emit('soundInput.level', { levels: this.peaks });
    this.peaks = [];
    const spectrum = this.analyser.take();
    if (spectrum) this.eventEmitter.emit('soundInput.spectrum', spectrum);
  }

  // Warnings are informational; anything else ends the stream, the next device poll reopens it.
  private onStreamError(type: RtAudioErrorType, message: string): void {
    if (type === RtAudioErrorType.WARNING || type === RtAudioErrorType.DEBUG_WARNING) return;
    this.logger.error(`Sound input stream error: ${JSON.stringify(message)}`);
    const failed = this.current;
    setImmediate(() => {
      // A newer sync() may already have reopened; only close the stream that failed.
      if (this.current === failed) this.close();
    });
  }
}

/** Peak of interleaved signed 16-bit samples per channel, 0..1. */
export function peakLevels(pcm: Buffer, channels: number): number[] {
  const peaks = Array.from({ length: channels }, () => 0);
  const samples = Math.floor(pcm.length / BYTES_PER_SAMPLE);
  for (let index = 0; index < samples; index++) {
    const channel = index % channels;
    const level = Math.abs(pcm.readInt16LE(index * BYTES_PER_SAMPLE)) / INT16_FULL_SCALE;
    if (level > (peaks[channel] ?? 0)) peaks[channel] = level;
  }
  return peaks;
}

// PipeWire/PulseAudio hold the ALSA hardware devices, so on Linux their sources are used when a server runs
// (it always lists at least its sinks, so a mic plugged in later still shows up).
function createRtAudio(): RtAudio | null {
  try {
    if (process.platform === 'linux') {
      const pulse = new RtAudio(RtAudioApi.LINUX_PULSE);
      if (pulse.getDevices().length > 0) return pulse;
    }
    return new RtAudio();
  } catch {
    return null;
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
