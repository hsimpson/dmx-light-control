import { describe, expect, it } from 'vitest';
import { liveOutput, restoreOutput, snapshotChannels, stepChannels } from './sequence-live-preview';
import type { SequenceStepDraft } from './sequence-steps';

const step = (values: [number, number][]): SequenceStepDraft => ({
  key: crypto.randomUUID(),
  fadeIn: 0,
  hold: 0,
  fadeOut: 0,
  dmxValues: values.map(([channel, value]) => ({ key: `${channel}`, channel, value })),
});

describe('sequence live preview helpers', () => {
  it('collects the channels used by any step', () => {
    expect(
      stepChannels([
        step([
          [3, 1],
          [1, 1],
        ]),
        step([
          [3, 2],
          [2, 1],
        ]),
      ]),
    ).toEqual([1, 2, 3]);
  });

  it('snapshots only channels missing from the restore set', () => {
    const universe = [10, 20, 30];
    const restore = snapshotChannels(universe, [1, 3], new Map([[1, 99]]));
    expect([...restore]).toEqual([
      [1, 99],
      [3, 30],
    ]);
  });

  it('outputs step values and restore values for channels the step omits', () => {
    const restore = new Map([
      [1, 10],
      [2, 20],
    ]);
    expect(liveOutput(step([[2, 255]]), restore)).toEqual([
      { channel: 1, value: 10 },
      { channel: 2, value: 255 },
    ]);
    expect(liveOutput(step([[2, 255]]), restore, new Set([1, 2]))).toEqual([
      { channel: 1, value: 0 },
      { channel: 2, value: 255 },
    ]);
    expect(restoreOutput(restore)).toEqual([
      { channel: 1, value: 10 },
      { channel: 2, value: 20 },
    ]);
  });
});
