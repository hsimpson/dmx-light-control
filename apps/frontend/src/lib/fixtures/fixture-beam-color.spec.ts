import { FixtureChannelPreset } from '@/shared/types/graphql/graphql';
import { describe, expect, it } from 'vitest';
import {
  fixtureBeamColor,
  type FixtureBeamAssignment,
  type FixtureBeamInput,
  type FixtureBeamRange,
} from './fixture-beam-color';

const megaTriparShutter: FixtureBeamRange[] = [
  { dmxStart: 0, dmxEnd: 31, description: 'LED Off' },
  { dmxStart: 32, dmxEnd: 63, description: 'LED On' },
  { dmxStart: 64, dmxEnd: 95, description: 'Strobing, slow to fast' },
  { dmxStart: 96, dmxEnd: 127, description: 'LED On' },
  { dmxStart: 128, dmxEnd: 159, description: 'Strobe Pulse, slow to fast' },
  { dmxStart: 160, dmxEnd: 191, description: 'LED On' },
  { dmxStart: 192, dmxEnd: 223, description: 'Random Strobe, slow to fast' },
  { dmxStart: 224, dmxEnd: 255, description: 'LED On' },
];

function assignment(
  channelNumber: number,
  preset: FixtureChannelPreset,
  ranges?: FixtureBeamRange[],
): FixtureBeamAssignment {
  return {
    channelNumber,
    fixtureChannelDefinition: {
      preset,
      ...(ranges ? { fixtureChannelRanges: ranges } : {}),
    },
  };
}

function fixture(assignments: FixtureBeamAssignment[], startAddress = 1): FixtureBeamInput {
  return {
    startAddress,
    channelMode: { fixtureChannelAssignments: assignments },
  };
}

function channels(values: Record<number, number>): number[] {
  const universe = Array.from({ length: 512 }, () => 0);
  for (const [channel, value] of Object.entries(values)) {
    universe[Number(channel) - 1] = value;
  }
  return universe;
}

describe('fixtureBeamColor', () => {
  it('mixes full red, green, and blue with no dimmer', () => {
    const patched = fixture([
      assignment(1, FixtureChannelPreset.IntensityRed),
      assignment(2, FixtureChannelPreset.IntensityGreen),
      assignment(3, FixtureChannelPreset.IntensityBlue),
    ]);

    expect(fixtureBeamColor(patched, channels({ 1: 255 }))).toMatchObject({ r: 1, g: 0, b: 0, strobeHz: 0 });
    expect(fixtureBeamColor(patched, channels({ 2: 255 }))).toMatchObject({ r: 0, g: 1, b: 0, strobeHz: 0 });
    expect(fixtureBeamColor(patched, channels({ 3: 255 }))).toMatchObject({ r: 0, g: 0, b: 1, strobeHz: 0 });
  });

  it('adds white, amber, and UV and clamps the sum', () => {
    const patched = fixture([
      assignment(1, FixtureChannelPreset.IntensityWhite),
      assignment(2, FixtureChannelPreset.IntensityAmber),
      assignment(3, FixtureChannelPreset.IntensityUv),
      assignment(4, FixtureChannelPreset.IntensityRed),
    ]);

    expect(fixtureBeamColor(patched, channels({ 1: 255 }))).toMatchObject({ r: 1, g: 1, b: 1 });
    expect(fixtureBeamColor(patched, channels({ 2: 255 })).g).toBeCloseTo(191 / 255);
    expect(fixtureBeamColor(patched, channels({ 3: 255 })).r).toBeCloseTo(138 / 255);
    expect(fixtureBeamColor(patched, channels({ 3: 255 })).b).toBe(1);
    expect(fixtureBeamColor(patched, channels({ 1: 255, 4: 255 })).r).toBe(1);
  });

  it('scales by dimmer and master dimmer and stays full when neither is patched', () => {
    const red = assignment(1, FixtureChannelPreset.IntensityRed);
    expect(
      fixtureBeamColor(
        fixture([red, assignment(2, FixtureChannelPreset.IntensityDimmer)]),
        channels({ 1: 255, 2: 128 }),
      ).r,
    ).toBeCloseTo(128 / 255);
    expect(fixtureBeamColor(fixture([red]), channels({ 1: 255 })).r).toBe(1);
    expect(
      fixtureBeamColor(
        fixture([
          red,
          assignment(2, FixtureChannelPreset.IntensityDimmer),
          assignment(3, FixtureChannelPreset.IntensityMasterDimmer),
        ]),
        channels({ 1: 255, 2: 128, 3: 128 }),
      ).r,
    ).toBeCloseTo((128 / 255) * (128 / 255));
  });

  it('throws white for a dimmer-only fixture and black when every color is zero', () => {
    const dimmerOnly = fixture([assignment(1, FixtureChannelPreset.IntensityDimmer)]);
    expect(fixtureBeamColor(dimmerOnly, channels({ 1: 255 }))).toMatchObject({ r: 1, g: 1, b: 1, strobeHz: 0 });
    expect(fixtureBeamColor(dimmerOnly, channels({ 1: 0 }))).toMatchObject({ r: 0, g: 0, b: 0 });

    const rgb = fixture([
      assignment(1, FixtureChannelPreset.IntensityRed),
      assignment(2, FixtureChannelPreset.IntensityGreen),
      assignment(3, FixtureChannelPreset.IntensityBlue),
    ]);
    expect(fixtureBeamColor(rgb, channels({}))).toMatchObject({ r: 0, g: 0, b: 0 });
  });

  it('reads Mega TriPar shutter bands', () => {
    const patched = fixture([
      assignment(1, FixtureChannelPreset.IntensityRed),
      assignment(2, FixtureChannelPreset.ShutterStrobeSlowFast, megaTriparShutter),
    ]);

    expect(fixtureBeamColor(patched, channels({ 1: 255, 2: 0 }))).toMatchObject({ r: 0, g: 0, b: 0, strobeHz: 0 });
    expect(fixtureBeamColor(patched, channels({ 1: 255, 2: 32 }))).toMatchObject({ r: 1, g: 0, b: 0, strobeHz: 0 });

    const slow = fixtureBeamColor(patched, channels({ 1: 255, 2: 64 }));
    expect(slow.r).toBe(1);
    expect(slow.strobeHz).toBeCloseTo(1);

    const fast = fixtureBeamColor(patched, channels({ 1: 255, 2: 95 }));
    expect(fast.strobeHz).toBeCloseTo(20);
  });

  it('treats a full-range rate channel as steady at 0 and about 20 Hz at 255', () => {
    const patched = fixture([
      assignment(1, FixtureChannelPreset.IntensityDimmer),
      assignment(2, FixtureChannelPreset.ShutterStrobeSlowFast, [
        { dmxStart: 0, dmxEnd: 255, description: 'Stroboscope (rate 0 - 100%)' },
      ]),
    ]);

    expect(fixtureBeamColor(patched, channels({ 1: 255, 2: 0 }))).toMatchObject({ r: 1, g: 1, b: 1, strobeHz: 0 });
    expect(fixtureBeamColor(patched, channels({ 1: 255, 2: 255 })).strobeHz).toBeCloseTo(20);
  });

  it('inverts the rate for fast-to-slow strobe', () => {
    const patched = fixture([
      assignment(1, FixtureChannelPreset.IntensityWhite),
      assignment(2, FixtureChannelPreset.ShutterStrobeFastSlow, [{ dmxStart: 0, dmxEnd: 255, description: 'Strobe' }]),
    ]);

    expect(fixtureBeamColor(patched, channels({ 1: 255, 2: 255 })).strobeHz).toBeCloseTo(1);
    expect(fixtureBeamColor(patched, channels({ 1: 255, 2: 1 })).strobeHz).toBeGreaterThan(19);
  });

  it('uses a color-macro name, blackout, or white for unknown text', () => {
    const colour = fixture([
      assignment(1, FixtureChannelPreset.IntensityDimmer),
      assignment(2, FixtureChannelPreset.ColorMacro, [
        { dmxStart: 0, dmxEnd: 10, description: 'Blackout' },
        { dmxStart: 11, dmxEnd: 20, description: 'Red' },
      ]),
    ]);

    expect(fixtureBeamColor(colour, channels({ 1: 255, 2: 15 }))).toMatchObject({ r: 1, g: 0, b: 0 });
    expect(fixtureBeamColor(colour, channels({ 1: 255, 2: 0 }))).toMatchObject({ r: 0, g: 0, b: 0 });

    const unknown = fixture([
      assignment(1, FixtureChannelPreset.IntensityDimmer),
      assignment(2, FixtureChannelPreset.ColorMacro, [{ dmxStart: 0, dmxEnd: 51, description: 'Dimming Mode' }]),
    ]);
    expect(fixtureBeamColor(unknown, channels({ 1: 255, 2: 10 }))).toMatchObject({ r: 1, g: 1, b: 1 });
  });

  it('ignores color macros when additive color channels are patched', () => {
    const patched = fixture([
      assignment(1, FixtureChannelPreset.IntensityRed),
      assignment(2, FixtureChannelPreset.ColorMacro, [{ dmxStart: 0, dmxEnd: 255, description: 'Green' }]),
    ]);

    expect(fixtureBeamColor(patched, channels({ 1: 255, 2: 255 }))).toMatchObject({ r: 1, g: 0, b: 0 });
    expect(fixtureBeamColor(patched, channels({ 2: 255 }))).toMatchObject({ r: 0, g: 0, b: 0 });
  });

  it('ignores custom channels and values outside the mode', () => {
    const patched = fixture([
      assignment(1, FixtureChannelPreset.Custom),
      assignment(2, FixtureChannelPreset.IntensityBlue),
    ]);

    expect(fixtureBeamColor(patched, channels({ 1: 255, 2: 255, 3: 255 }))).toMatchObject({ r: 0, g: 0, b: 1 });
  });

  it('reads the universe from the start address', () => {
    const patched = fixture([assignment(1, FixtureChannelPreset.IntensityGreen)], 10);
    expect(fixtureBeamColor(patched, channels({ 10: 255 }))).toMatchObject({ r: 0, g: 1, b: 0 });
    expect(fixtureBeamColor(patched, channels({ 1: 255 }))).toMatchObject({ r: 0, g: 0, b: 0 });
  });
});
