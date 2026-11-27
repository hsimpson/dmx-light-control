import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUDIO_OUTPUT_FRAMES, AudioOutputService } from './audio-output.service';

const { audio } = vi.hoisted(() => {
  const state = {
    devices: [] as { id: number; name: string; inputChannels: number; outputChannels: number }[],
    written: [] as Buffer[],
    stream: null as {
      output: { deviceId: number; nChannels: number };
      sampleRate: number;
      onFrame: () => void;
      onError: (type: number, message: string) => void;
    } | null,
  };

  class FakeRtAudio {
    public readonly start = vi.fn<() => void>();
    public getDevices(): typeof state.devices {
      return state.devices;
    }
    public openStream(
      output: { deviceId: number; nChannels: number },
      _input: null,
      _format: number,
      sampleRate: number,
      _frames: number,
      _name: string,
      _onInput: null,
      onFrame: () => void,
      _flags: undefined,
      onError: (type: number, message: string) => void,
    ): void {
      state.stream = { output, sampleRate, onFrame, onError };
    }
    public write(pcm: Buffer): void {
      state.written.push(pcm);
    }
    public isStreamOpen(): boolean {
      return state.stream !== null;
    }
    public closeStream(): void {
      state.stream = null;
    }
  }

  return { audio: { state, FakeRtAudio } };
});

vi.mock('audify', () => ({
  RtAudio: audio.FakeRtAudio,
  RtAudioApi: { LINUX_PULSE: 4 },
  RtAudioFormat: { RTAUDIO_SINT16: 2 },
  RtAudioErrorType: { WARNING: 0, DEBUG_WARNING: 1, DRIVER_ERROR: 8 },
}));

const FRAME_BYTES = AUDIO_OUTPUT_FRAMES * 4;

describe('AudioOutputService', () => {
  let service: AudioOutputService;

  beforeEach(() => {
    audio.state.devices = [
      { id: 1, name: 'Mic', inputChannels: 1, outputChannels: 0 },
      { id: 2, name: 'Speakers', inputChannels: 0, outputChannels: 2 },
    ];
    audio.state.written = [];
    audio.state.stream = null;
    service = new AudioOutputService();
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('GIVEN devices WHEN listing THEN only playback-capable ones are outputs', () => {
    expect(service.listOutputs()).toEqual([{ name: 'Speakers' }]);
  });

  it('GIVEN an output WHEN opened THEN it plays 48 kHz stereo and queues silence first', () => {
    service.sync('Speakers');

    expect(service.openHandle()).toBe('Speakers');
    expect(audio.state.stream?.output).toEqual({ deviceId: 2, nChannels: 2 });
    expect(audio.state.stream?.sampleRate).toBe(48000);
    expect(audio.state.written).toHaveLength(2);
    expect(audio.state.written.every(pcm => pcm.length === FRAME_BYTES && pcm.every(byte => byte === 0))).toBe(true);
  });

  it('GIVEN a source WHEN a buffer finished playing THEN the next one is pulled from it, silence without it', () => {
    service.sync('Speakers');
    const music = Buffer.alloc(FRAME_BYTES, 7);
    service.setSource(() => music);

    audio.state.stream?.onFrame();
    service.setSource(null);
    audio.state.stream?.onFrame();

    expect(audio.state.written.slice(2)).toEqual([music, Buffer.alloc(FRAME_BYTES)]);
  });

  it('GIVEN an unknown name WHEN synced THEN nothing opens', () => {
    service.sync('Mic');

    expect(service.openHandle()).toBeNull();
    expect(audio.state.stream).toBeNull();
  });

  it('GIVEN an open output WHEN the driver fails THEN the stream closes, a warning keeps it', async () => {
    service.sync('Speakers');

    audio.state.stream?.onError(0, 'underrun');
    await new Promise(resolve => setImmediate(resolve));
    expect(service.openHandle()).toBe('Speakers');

    audio.state.stream?.onError(8, 'device removed');
    await new Promise(resolve => setImmediate(resolve));
    expect(service.openHandle()).toBeNull();
    expect(audio.state.stream).toBeNull();
  });
});
