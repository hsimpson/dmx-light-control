import { AppEventEmitter } from '@/events/app-event-emitter';
import { EventEmitter2 } from 'eventemitter2';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { peakLevels, SoundInputService } from './sound-input.service';
import { type SpectrumFrame, volumeLevel } from './spectrum';

const { audio } = vi.hoisted(() => {
  type Stream = {
    deviceId: number;
    nChannels: number;
    sampleRate: number;
    onInput: (pcm: Buffer) => void;
    onError: (type: number, message: string) => void;
  };
  const state = {
    devices: [] as { id: number; name: string; inputChannels: number; preferredSampleRate: number }[],
    openFailure: null as Error | null,
    listFailure: null as Error | null,
    stream: null as Stream | null,
    opened: 0,
  };

  class FakeRtAudio {
    public readonly start = vi.fn<() => void>();
    public getDevices(): typeof state.devices {
      if (state.listFailure) throw state.listFailure;
      return state.devices;
    }
    public openStream(
      _output: null,
      input: { deviceId: number; nChannels: number },
      _format: number,
      sampleRate: number,
      _frames: number,
      _name: string,
      onInput: (pcm: Buffer) => void,
      _onOutput: null,
      _flags: number,
      onError: (type: number, message: string) => void,
    ): void {
      if (state.openFailure) throw state.openFailure;
      state.stream = { ...input, sampleRate, onInput, onError };
      state.opened++;
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
  RtAudioStreamFlags: { RTAUDIO_MINIMIZE_LATENCY: 2 },
  RtAudioErrorType: { WARNING: 0, DEBUG_WARNING: 1, DRIVER_ERROR: 8 },
}));

function pcm(...samples: number[]): Buffer {
  const buffer = Buffer.alloc(samples.length * 2);
  samples.forEach((sample, index) => buffer.writeInt16LE(sample, index * 2));
  return buffer;
}

describe('peakLevels', () => {
  it('GIVEN interleaved stereo samples WHEN measured THEN returns the absolute peak per channel', () => {
    expect(peakLevels(pcm(16384, -8192, -32768, 0), 2)).toEqual([1, 0.25]);
  });

  it('GIVEN mono silence WHEN measured THEN returns zero', () => {
    expect(peakLevels(pcm(0, 0, 0), 1)).toEqual([0]);
  });
});

describe('SoundInputService', () => {
  let levels: number[][];
  let spectra: SpectrumFrame[];
  let beats: number[];
  let service: SoundInputService;

  beforeEach(() => {
    vi.useFakeTimers();
    Object.assign(audio.state, {
      devices: [{ id: 7, name: 'StreamCam', inputChannels: 2, preferredSampleRate: 44100 }],
      openFailure: null,
      listFailure: null,
      stream: null,
      opened: 0,
    });
    levels = [];
    spectra = [];
    const eventEmitter = new AppEventEmitter(new EventEmitter2());
    eventEmitter.on('soundInput.level', payload => {
      levels.push(payload.levels);
    });
    eventEmitter.on('soundInput.spectrum', payload => {
      spectra.push(payload);
    });
    beats = [];
    eventEmitter.on('soundInput.beat', payload => {
      beats.push(payload.level);
    });
    service = new SoundInputService(eventEmitter);
  });

  afterEach(() => {
    service.onModuleDestroy();
    vi.useRealTimers();
  });

  it('GIVEN a kick right after a level emit WHEN captured THEN the beat is not held back by the meter throttle', () => {
    service.sync({ handle: 'StreamCam', channels: 1 });
    const silence = Buffer.alloc(22050 * 2);
    const kick = Buffer.alloc(8192 * 2);
    for (let index = 0; index < 8192; index++) {
      kick.writeInt16LE(Math.round(26000 * Math.sin((2 * Math.PI * 60 * index) / 44100)), index * 2);
    }

    audio.state.stream?.onInput(silence);
    const levelsBeforeKick = levels.length;
    audio.state.stream?.onInput(kick);

    expect(levels).toHaveLength(levelsBeforeKick);
    expect(beats).toHaveLength(1);
    expect(beats[0]).toBeGreaterThan(0.5);
  });

  it('GIVEN an available device WHEN synced THEN opens it by name with the requested channels', () => {
    service.sync({ handle: 'StreamCam', channels: 2 });

    expect(audio.state.stream).toMatchObject({ deviceId: 7, nChannels: 2, sampleRate: 44100 });
    expect(service.openHandle()).toBe('StreamCam');
  });

  it('GIVEN an open stream WHEN synced with the same target THEN it is not reopened', () => {
    service.sync({ handle: 'StreamCam', channels: 2 });
    service.sync({ handle: 'StreamCam', channels: 2 });

    expect(audio.state.opened).toBe(1);
  });

  it('GIVEN a mono-only device WHEN stereo is requested THEN it captures in mono', () => {
    audio.state.devices = [{ id: 7, name: 'StreamCam', inputChannels: 1, preferredSampleRate: 44100 }];

    service.sync({ handle: 'StreamCam', channels: 2 });

    expect(audio.state.stream).toMatchObject({ nChannels: 1 });
    expect(service.openHandle()).toBe('StreamCam');
  });

  it('GIVEN the audio backend throws WHEN synced THEN sync does not throw and nothing is open', () => {
    audio.state.listFailure = new Error('PipeWire restarted');

    expect(() => {
      service.sync({ handle: 'StreamCam', channels: 1 });
    }).not.toThrow();
    expect(service.openHandle()).toBeNull();
  });

  it('GIVEN the driver rejects the stream WHEN synced THEN no handle is open', () => {
    audio.state.openFailure = new Error('device busy');

    service.sync({ handle: 'StreamCam', channels: 1 });

    expect(service.openHandle()).toBeNull();
  });

  it('GIVEN an open stream WHEN synced with null THEN it closes and the meter drops to silence', () => {
    service.sync({ handle: 'StreamCam', channels: 2 });

    service.sync(null);

    expect(audio.state.stream).toBeNull();
    expect(service.openHandle()).toBeNull();
    expect(levels).toEqual([[0, 0]]);
  });

  it('GIVEN audio buffers WHEN they arrive faster than the meter rate THEN emits the peak of the window', () => {
    vi.setSystemTime(1_000);
    service.sync({ handle: 'StreamCam', channels: 2 });

    audio.state.stream?.onInput(pcm(8192, 0));
    vi.setSystemTime(1_020);
    audio.state.stream?.onInput(pcm(16384, 4096));
    vi.setSystemTime(1_060);
    audio.state.stream?.onInput(pcm(0, 0));

    expect(levels).toEqual([
      [0.25, 0],
      [0.5, 0.125],
    ]);
  });

  it('GIVEN a full-scale stereo buffer WHEN it arrives THEN a spectrum with the device sample rate is emitted, empty on close', () => {
    service.sync({ handle: 'StreamCam', channels: 2 });

    audio.state.stream?.onInput(pcm(...Array.from({ length: 4096 }, (_, index) => (index % 4 < 2 ? 32767 : -32767))));
    service.sync(null);

    expect(spectra).toHaveLength(2);
    expect(spectra[0]).toMatchObject({ sampleRate: 44100 });
    expect(volumeLevel(spectra[0] ?? { power: [], sampleRate: 0, meanSquare: 0 })).toBeGreaterThan(0.95);
    expect(spectra[0]?.power).toHaveLength(1025);
    expect(spectra[1]).toEqual({ power: [], sampleRate: 0, meanSquare: 0 });
  });

  it('GIVEN an open stream WHEN the driver reports an error THEN the stream closes, warnings are ignored', async () => {
    service.sync({ handle: 'StreamCam', channels: 1 });

    audio.state.stream?.onError(0, 'underrun');
    await vi.advanceTimersByTimeAsync(0);
    const afterWarning = service.openHandle();
    audio.state.stream?.onError(8, 'device removed');
    await vi.advanceTimersByTimeAsync(0);

    expect(afterWarning).toBe('StreamCam');
    expect(service.openHandle()).toBeNull();
  });

  it('GIVEN a stream error WHEN a newer sync reopens before the deferred close THEN the new stream stays open', async () => {
    service.sync({ handle: 'StreamCam', channels: 2 });

    audio.state.stream?.onError(8, 'device removed');
    service.sync({ handle: 'StreamCam', channels: 1 });
    await vi.advanceTimersByTimeAsync(0);

    expect(service.openHandle()).toBe('StreamCam');
    expect(audio.state.stream).toMatchObject({ nChannels: 1 });
  });

  it('GIVEN devices without input channels WHEN listing THEN only capture devices are returned', () => {
    audio.state.devices.push({ id: 8, name: 'HDMI', inputChannels: 0, preferredSampleRate: 48000 });

    expect(service.listInputs()).toEqual([{ name: 'StreamCam', maxInputChannels: 2 }]);
  });
});
