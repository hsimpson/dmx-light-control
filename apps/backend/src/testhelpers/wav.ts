const KICK_HZ = 60;
const KICK_MS = 80;

/** 16-bit PCM mono WAV: a 60 Hz kick every `intervalMs` from `firstMs` on, silence in between. */
export function kickTrackWav(sampleRate: number, durationMs: number, intervalMs: number, firstMs: number): Buffer {
  const frames = Math.round((sampleRate * durationMs) / 1000);
  const data = Buffer.alloc(frames * 2);
  for (let frame = 0; frame < frames; frame++) {
    const ms = (frame / sampleRate) * 1000;
    const sinceKick = (ms - firstMs) % intervalMs;
    const inKick = ms >= firstMs && sinceKick < KICK_MS;
    const sample = inKick ? 0.8 * Math.sin((2 * Math.PI * KICK_HZ * sinceKick) / 1000) * (1 - sinceKick / KICK_MS) : 0;
    data.writeInt16LE(Math.round(sample * 32767), frame * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}
