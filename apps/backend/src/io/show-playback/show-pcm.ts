import { AUDIO_BYTES_PER_FRAME } from '@/io/audio-file/decode-audio';

/** An open decoded clip: where it sits on the show timeline and how many frames its file holds. */
export type PcmClip = { startFrame: number; frames: number; fd: number };

export type ReadAt = (fd: number, target: Buffer, offset: number, length: number, position: number) => number;

/** `frames` frames of the show from `startFrame`: clip audio where clips are, silence in between. */
export function showPcm(clips: readonly PcmClip[], startFrame: number, frames: number, read: ReadAt): Buffer {
  const pcm = Buffer.alloc(frames * AUDIO_BYTES_PER_FRAME);
  const endFrame = startFrame + frames;
  for (const clip of clips) {
    const from = Math.max(startFrame, clip.startFrame);
    const to = Math.min(endFrame, clip.startFrame + clip.frames);
    if (to <= from) continue;
    read(
      clip.fd,
      pcm,
      (from - startFrame) * AUDIO_BYTES_PER_FRAME,
      (to - from) * AUDIO_BYTES_PER_FRAME,
      (from - clip.startFrame) * AUDIO_BYTES_PER_FRAME,
    );
  }
  return pcm;
}
