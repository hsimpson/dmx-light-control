import { AUDIO_BYTES_PER_FRAME, AUDIO_CHANNELS, AUDIO_SAMPLE_RATE } from '@/io/audio-file/decode-audio';
import { createRtAudio, errorMessage } from '@/io/rt-audio';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { RtAudio, RtAudioErrorType, RtAudioFormat } from 'audify';

/** Sample frames per device buffer: ~21 ms at 48 kHz, the granularity of the playback clock. */
export const AUDIO_OUTPUT_FRAMES = 1024;
/** Buffers queued ahead of the device at open: a pulled buffer is heard this many buffers later. */
export const AUDIO_OUTPUT_QUEUED_BUFFERS = 2;
const SILENCE = Buffer.alloc(AUDIO_OUTPUT_FRAMES * AUDIO_BYTES_PER_FRAME);

/** Returns the next `AUDIO_OUTPUT_FRAMES` frames of 48 kHz stereo s16le PCM; called once per played buffer. */
export type AudioOutputSource = () => Buffer;

export type AudioOutputDevice = { name: string };

/** Plays the project's single audio output; pulls PCM from the current source, silence without one. */
@Injectable()
export class AudioOutputService implements OnModuleDestroy {
  private readonly logger = new Logger(AudioOutputService.name);
  private readonly rtAudio = createRtAudio();
  private current: string | null = null;
  private source: AudioOutputSource | null = null;

  public constructor() {
    if (!this.rtAudio) this.logger.warn('Audio backend unavailable: audio outputs are disabled');
  }

  public onModuleDestroy(): void {
    this.sync(null);
  }

  public listOutputs(): AudioOutputDevice[] {
    return (this.rtAudio?.getDevices() ?? [])
      .filter(device => device.outputChannels > 0)
      .map(device => ({ name: device.name }));
  }

  public openHandle(): string | null {
    return this.current;
  }

  public setSource(source: AudioOutputSource | null): void {
    this.source = source;
  }

  /** Opens the device named `handle`, or closes the stream for null. */
  // Never throws: a native failure here must not break the device manager's reconcile loop.
  public sync(handle: string | null): void {
    if (handle === this.current) return;
    try {
      this.close();
      if (handle && this.rtAudio) this.open(this.rtAudio, handle);
    } catch (err) {
      this.logger.error(`Audio output sync failed: ${errorMessage(err)}`);
      this.current = null;
    }
  }

  private open(rtAudio: RtAudio, handle: string): void {
    // Device ids shift when devices come and go, so the name is resolved on every open.
    const device = rtAudio.getDevices().find(candidate => candidate.name === handle && candidate.outputChannels > 0);
    if (!device) {
      this.logger.warn(`Audio output ${JSON.stringify(handle)} is not available`);
      return;
    }
    try {
      rtAudio.openStream(
        { deviceId: device.id, nChannels: AUDIO_CHANNELS },
        null,
        RtAudioFormat.RTAUDIO_SINT16,
        AUDIO_SAMPLE_RATE,
        AUDIO_OUTPUT_FRAMES,
        'dmx-light-control',
        null,
        () => {
          rtAudio.write(this.source?.() ?? SILENCE);
        },
        undefined,
        (type, message) => {
          this.onStreamError(type, message);
        },
      );
      // A small queue lets the device play while the next buffer is pulled.
      for (let index = 0; index < AUDIO_OUTPUT_QUEUED_BUFFERS; index++) rtAudio.write(SILENCE);
      rtAudio.start();
    } catch (err) {
      this.logger.error(`Failed to open audio output ${JSON.stringify(handle)}: ${errorMessage(err)}`);
      this.closeStream();
      return;
    }
    this.current = handle;
    this.logger.log(`Opened audio output ${JSON.stringify(handle)}`);
  }

  private close(): void {
    if (!this.current) return;
    const handle = this.current;
    this.current = null;
    this.closeStream();
    this.logger.log(`Closed audio output ${JSON.stringify(handle)}`);
  }

  private closeStream(): void {
    if (this.rtAudio?.isStreamOpen()) this.rtAudio.closeStream();
  }

  // Warnings (e.g. underruns) are informational; anything else ends the stream, the next device poll reopens it.
  private onStreamError(type: RtAudioErrorType, message: string): void {
    if (type === RtAudioErrorType.WARNING || type === RtAudioErrorType.DEBUG_WARNING) return;
    this.logger.error(`Audio output stream error: ${JSON.stringify(message)}`);
    const failed = this.current;
    setImmediate(() => {
      if (this.current === failed) this.close();
    });
  }
}
