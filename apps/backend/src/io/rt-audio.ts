import { RtAudio, RtAudioApi } from 'audify';

// PipeWire/PulseAudio hold the ALSA hardware devices, so on Linux their devices are used when a server runs
// (it always lists at least its sinks, so a mic plugged in later still shows up).
export function createRtAudio(): RtAudio | null {
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

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
