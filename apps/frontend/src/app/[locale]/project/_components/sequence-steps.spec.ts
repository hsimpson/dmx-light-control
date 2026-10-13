import { describe, expect, it } from 'vitest';
import {
  absoluteDmxChannel,
  firstUnusedAbsoluteChannel,
  fixtureForAbsoluteChannel,
  moveSequenceStep,
  type SequenceFixtureChannel,
  type SequenceStepDraft,
} from './sequence-steps';

const wash: SequenceFixtureChannel = {
  publicId: 'wash',
  startAddress: 1,
  name: 'Wash',
  channels: [{ channelNumber: 1, name: 'Intensity' }],
};

const par: SequenceFixtureChannel = {
  publicId: 'par',
  startAddress: 10,
  name: 'PAR',
  channels: [
    { channelNumber: 1, name: 'Dimmer' },
    { channelNumber: 2, name: 'Red' },
  ],
};

const step = (id: number, channel?: number): SequenceStepDraft => ({
  key: `step-${id}`,
  fadeIn: id,
  hold: 0,
  fadeOut: 0,
  dmxValues: channel === undefined ? [] : [{ key: `dmx-${id}`, channel, value: 255 }],
});

describe('sequence steps', () => {
  it('keeps each step channel with that step when the array is reordered', () => {
    const moved = moveSequenceStep([step(0, 1), step(1, 10), step(2, 11)], 0, 2);
    expect(moved.map(item => item.key)).toEqual(['step-1', 'step-2', 'step-0']);
    expect(moved.map(item => item.dmxValues[0]?.channel)).toEqual([10, 11, 1]);
  });

  it('maps a fixture channel onto its absolute DMX address', () => {
    expect(absoluteDmxChannel(10, 2)).toBe(11);
    expect(fixtureForAbsoluteChannel([par, wash], 11)?.publicId).toBe('par');
    expect(firstUnusedAbsoluteChannel([par, wash], [1])).toBe(10);
  });
});
