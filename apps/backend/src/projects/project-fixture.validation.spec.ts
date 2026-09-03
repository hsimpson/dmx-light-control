import { describe, expect, it } from 'vitest';
import {
  assertChannelModeBelongsToFixture,
  assertNoPatchOverlap,
  assertValidPatchAddress,
  channelCountFromMode,
  dmxRangesOverlap,
} from './project-fixture.validation';
import {
  ChannelModeFixtureMismatchException,
  DmxAddressOutOfRangeException,
  EmptyChannelModeException,
  ProjectFixtureAddressOverlapException,
} from './project.exceptions';

describe('project-fixture.validation', () => {
  it('channelCountFromMode returns max channel number', () => {
    expect(channelCountFromMode({ fixtureChannelAssignments: [{ channelNumber: 1 }, { channelNumber: 6 }] })).toBe(6);
  });

  it('channelCountFromMode returns 0 for empty assignments', () => {
    expect(channelCountFromMode({ fixtureChannelAssignments: [] })).toBe(0);
  });

  it('assertChannelModeBelongsToFixture throws on mismatch', () => {
    expect(() => {
      assertChannelModeBelongsToFixture({ fixtureId: 2, fixtureChannelAssignments: [{ channelNumber: 1 }] }, 1);
    }).toThrow(ChannelModeFixtureMismatchException);
  });

  it('assertValidPatchAddress rejects empty modes', () => {
    expect(() => {
      assertValidPatchAddress(1, { fixtureChannelAssignments: [] });
    }).toThrow(EmptyChannelModeException);
  });

  it('assertValidPatchAddress rejects footprint overflow', () => {
    expect(() => {
      assertValidPatchAddress(511, {
        fixtureChannelAssignments: [{ channelNumber: 1 }, { channelNumber: 2 }, { channelNumber: 3 }],
      });
    }).toThrow(DmxAddressOutOfRangeException);
  });

  it('assertValidPatchAddress accepts valid range', () => {
    expect(() => {
      assertValidPatchAddress(510, {
        fixtureChannelAssignments: [{ channelNumber: 1 }, { channelNumber: 2 }],
      });
    }).not.toThrow();
  });

  it('dmxRangesOverlap is false for adjacent footprints', () => {
    expect(dmxRangesOverlap(1, 3, 4, 3)).toBe(false);
  });

  it('dmxRangesOverlap is true when ranges share a channel', () => {
    expect(dmxRangesOverlap(1, 3, 3, 3)).toBe(true);
    expect(dmxRangesOverlap(10, 4, 8, 3)).toBe(true);
  });

  it('assertNoPatchOverlap accepts adjacent occupied patches', () => {
    expect(() => {
      assertNoPatchOverlap(5, 4, [{ startAddress: 1, channelCount: 4 }]);
    }).not.toThrow();
  });

  it('assertNoPatchOverlap rejects an overlapping occupied patch', () => {
    expect(() => {
      assertNoPatchOverlap(3, 4, [{ startAddress: 1, channelCount: 4 }]);
    }).toThrow(ProjectFixtureAddressOverlapException);
  });
});
