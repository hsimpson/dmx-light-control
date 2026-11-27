import { describe, expect, it } from 'vitest';
import { showPcm, type ReadAt } from './show-pcm';

/** Fake files: fd n holds frames whose every byte is n. */
const read: ReadAt = (fd, target, offset, length) => {
  target.fill(fd, offset, offset + length);
  return length;
};

const framesOf = (pcm: Buffer) => Array.from({ length: pcm.length / 4 }, (_, frame) => pcm[frame * 4]);

describe('showPcm', () => {
  it('GIVEN two clips with a gap WHEN a buffer spans them THEN each part comes from its clip and the gap is silent', () => {
    const clips = [
      { fd: 1, startFrame: 0, frames: 3 },
      { fd: 2, startFrame: 5, frames: 3 },
    ];

    expect(framesOf(showPcm(clips, 1, 6, read))).toEqual([1, 1, 0, 0, 2, 2]);
  });

  it('GIVEN a buffer inside a clip WHEN read THEN the file position is relative to the clip start', () => {
    const positions: number[] = [];
    const recording: ReadAt = (fd, target, offset, length, position) => {
      positions.push(position);
      return read(fd, target, offset, length, position);
    };

    showPcm([{ fd: 1, startFrame: 100, frames: 1000 }], 150, 10, recording);

    expect(positions).toEqual([50 * 4]);
  });

  it('GIVEN no clip under the playhead WHEN read THEN the buffer is silence of the asked length', () => {
    const pcm = showPcm([{ fd: 1, startFrame: 0, frames: 10 }], 20, 8, read);

    expect(pcm.length).toBe(32);
    expect(pcm.every(byte => byte === 0)).toBe(true);
  });
});
