import { FixtureChannelPreset } from '@/shared/types/graphql/graphql';

const DMX_CHANNEL_COUNT = 512;
const FULL_SCALE = 255;
const STROBE_MIN_HZ = 1;
const STROBE_MAX_HZ = 20;

export type FixtureBeamRange = {
  dmxStart: number;
  dmxEnd: number;
  description: string;
};

export type FixtureBeamAssignment = {
  channelNumber: number;
  fixtureChannelDefinition: {
    preset: FixtureChannelPreset;
    fixtureChannelRanges?: readonly FixtureBeamRange[] | null;
  };
};

export type FixtureBeamInput = {
  startAddress: number;
  channelMode: {
    fixtureChannelAssignments: readonly FixtureBeamAssignment[];
  };
};

export type FixtureBeamColor = {
  /** Linear RGB, 0–1, already scaled by dimmer and shutter open. */
  r: number;
  g: number;
  b: number;
  /** Square-wave rate. 0 means steady. */
  strobeHz: number;
};

const ADDITIVE_PRESETS = new Set<FixtureChannelPreset>([
  FixtureChannelPreset.IntensityRed,
  FixtureChannelPreset.IntensityGreen,
  FixtureChannelPreset.IntensityBlue,
  FixtureChannelPreset.IntensityWhite,
  FixtureChannelPreset.IntensityAmber,
  FixtureChannelPreset.IntensityUv,
]);

const DIMMER_PRESETS = new Set<FixtureChannelPreset>([
  FixtureChannelPreset.IntensityDimmer,
  FixtureChannelPreset.IntensityMasterDimmer,
]);

const NAMED_COLORS: Record<string, readonly [number, number, number]> = {
  red: [1, 0, 0],
  green: [0, 1, 0],
  blue: [0, 0, 1],
  white: [1, 1, 1],
  amber: [1, 191 / FULL_SCALE, 0],
  uv: [138 / FULL_SCALE, 0, 1],
  yellow: [1, 1, 0],
  cyan: [0, 1, 1],
  magenta: [1, 0, 1],
  orange: [1, 0.5, 0],
  lavender: [0.9, 0.7, 1],
  'light green': [0.56, 1, 0.56],
  turquoise: [0.25, 0.88, 0.82],
  'cool white': [0.85, 0.93, 1],
  'warm white': [1, 0.85, 0.7],
};

const CLOSED_NAME = /^(blackout|off|closed)$/i;
const SHUTTER_CLOSED = /(blackout|\boff\b|closed)/i;
const SHUTTER_STROBE = /(strob|pulse|random)/i;
const FULL_RANGE_RATE = /strob|rate/i;

type Rgb = { r: number; g: number; b: number };

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function clampByte(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(FULL_SCALE, Math.max(0, value));
}

function channelValue(dmxChannels: ArrayLike<number>, startAddress: number, channelNumber: number): number {
  const universeChannel = startAddress + channelNumber - 1;
  if (!Number.isInteger(universeChannel) || universeChannel < 1 || universeChannel > DMX_CHANNEL_COUNT) {
    return 0;
  }
  return clampByte(dmxChannels[universeChannel - 1] ?? 0);
}

function unitValue(dmxChannels: ArrayLike<number>, startAddress: number, channelNumber: number): number {
  return channelValue(dmxChannels, startAddress, channelNumber) / FULL_SCALE;
}

function addScaled(target: Rgb, r: number, g: number, b: number, scale: number): void {
  target.r += r * scale;
  target.g += g * scale;
  target.b += b * scale;
}

function additiveContribution(preset: FixtureChannelPreset, scale: number, target: Rgb): void {
  switch (preset) {
    case FixtureChannelPreset.IntensityRed:
      addScaled(target, 1, 0, 0, scale);
      break;
    case FixtureChannelPreset.IntensityGreen:
      addScaled(target, 0, 1, 0, scale);
      break;
    case FixtureChannelPreset.IntensityBlue:
      addScaled(target, 0, 0, 1, scale);
      break;
    case FixtureChannelPreset.IntensityWhite:
      addScaled(target, 1, 1, 1, scale);
      break;
    case FixtureChannelPreset.IntensityAmber:
      addScaled(target, 1, 191 / FULL_SCALE, 0, scale);
      break;
    case FixtureChannelPreset.IntensityUv:
      addScaled(target, 138 / FULL_SCALE, 0, 1, scale);
      break;
    case FixtureChannelPreset.ColorMacro:
    case FixtureChannelPreset.Custom:
    case FixtureChannelPreset.IntensityDimmer:
    case FixtureChannelPreset.IntensityMasterDimmer:
    case FixtureChannelPreset.ShutterStrobeFastSlow:
    case FixtureChannelPreset.ShutterStrobeSlowFast:
      break;
    default: {
      const unreachable: never = preset;
      return unreachable;
    }
  }
}

function containingRange(ranges: readonly FixtureBeamRange[], value: number): FixtureBeamRange | undefined {
  return ranges.find(range => value >= range.dmxStart && value <= range.dmxEnd);
}

function macroColor(description: string): Rgb | 'closed' | undefined {
  const name = description.trim().toLowerCase();
  if (CLOSED_NAME.test(name)) {
    return 'closed';
  }
  const named = NAMED_COLORS[name];
  if (!named) {
    return undefined;
  }
  return { r: named[0], g: named[1], b: named[2] };
}

function colorFromMacros(
  assignments: readonly FixtureBeamAssignment[],
  dmxChannels: ArrayLike<number>,
  startAddress: number,
): Rgb {
  const macros = assignments
    .filter(assignment => assignment.fixtureChannelDefinition.preset === FixtureChannelPreset.ColorMacro)
    .slice()
    .sort((left, right) => left.channelNumber - right.channelNumber);

  for (const assignment of macros) {
    const value = channelValue(dmxChannels, startAddress, assignment.channelNumber);
    const ranges = assignment.fixtureChannelDefinition.fixtureChannelRanges ?? [];
    const range = containingRange(ranges, value);
    if (!range) {
      continue;
    }
    const color = macroColor(range.description);
    if (color === 'closed') {
      return { r: 0, g: 0, b: 0 };
    }
    if (color) {
      return color;
    }
  }

  return { r: 1, g: 1, b: 1 };
}

function rangeFraction(range: FixtureBeamRange, value: number): number {
  const span = range.dmxEnd - range.dmxStart;
  if (span <= 0) {
    return 0;
  }
  return clamp01((value - range.dmxStart) / span);
}

function strobeHzFromFraction(fraction: number, preset: FixtureChannelPreset): number {
  const shaped = preset === FixtureChannelPreset.ShutterStrobeFastSlow ? 1 - fraction : fraction;
  return STROBE_MIN_HZ + shaped * (STROBE_MAX_HZ - STROBE_MIN_HZ);
}

function shutterState(
  assignment: FixtureBeamAssignment,
  dmxChannels: ArrayLike<number>,
  startAddress: number,
): { open: number; strobeHz: number } {
  const preset = assignment.fixtureChannelDefinition.preset;
  const value = channelValue(dmxChannels, startAddress, assignment.channelNumber);
  const ranges = assignment.fixtureChannelDefinition.fixtureChannelRanges ?? [];

  if (ranges.length === 0) {
    return { open: value > 0 ? 1 : 0, strobeHz: 0 };
  }

  const fullRangeRate =
    ranges.length === 1 &&
    ranges[0]?.dmxStart === 0 &&
    ranges[0].dmxEnd === FULL_SCALE &&
    FULL_RANGE_RATE.test(ranges[0].description);
  if (fullRangeRate) {
    if (value === 0) {
      return { open: 1, strobeHz: 0 };
    }
    return { open: 1, strobeHz: strobeHzFromFraction(value / FULL_SCALE, preset) };
  }

  const range = containingRange(ranges, value);
  if (!range) {
    return { open: value > 0 ? 1 : 0, strobeHz: 0 };
  }
  if (SHUTTER_CLOSED.test(range.description)) {
    return { open: 0, strobeHz: 0 };
  }
  if (SHUTTER_STROBE.test(range.description)) {
    return { open: 1, strobeHz: strobeHzFromFraction(rangeFraction(range, value), preset) };
  }
  return { open: 1, strobeHz: 0 };
}

export function fixtureBeamColor(fixture: FixtureBeamInput, dmxChannels: ArrayLike<number>): FixtureBeamColor {
  const { startAddress, channelMode } = fixture;
  const assignments = channelMode.fixtureChannelAssignments;
  const additive = assignments.filter(assignment => ADDITIVE_PRESETS.has(assignment.fixtureChannelDefinition.preset));

  const base: Rgb =
    additive.length > 0 ? { r: 0, g: 0, b: 0 } : colorFromMacros(assignments, dmxChannels, startAddress);
  if (additive.length > 0) {
    for (const assignment of additive) {
      additiveContribution(
        assignment.fixtureChannelDefinition.preset,
        unitValue(dmxChannels, startAddress, assignment.channelNumber),
        base,
      );
    }
    base.r = clamp01(base.r);
    base.g = clamp01(base.g);
    base.b = clamp01(base.b);
  }

  const dimmers = assignments.filter(assignment => DIMMER_PRESETS.has(assignment.fixtureChannelDefinition.preset));
  const dimmer =
    dimmers.length === 0
      ? 1
      : dimmers.reduce(
          (product, assignment) => product * unitValue(dmxChannels, startAddress, assignment.channelNumber),
          1,
        );

  let open = 1;
  let strobeHz = 0;
  for (const assignment of assignments) {
    const preset = assignment.fixtureChannelDefinition.preset;
    if (
      preset !== FixtureChannelPreset.ShutterStrobeSlowFast &&
      preset !== FixtureChannelPreset.ShutterStrobeFastSlow
    ) {
      continue;
    }
    const shutter = shutterState(assignment, dmxChannels, startAddress);
    open *= shutter.open;
    strobeHz = Math.max(strobeHz, shutter.strobeHz);
  }

  const scale = dimmer * open;
  return {
    r: base.r * scale,
    g: base.g * scale,
    b: base.b * scale,
    strobeHz: open > 0 ? strobeHz : 0,
  };
}
