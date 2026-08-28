import { describe, expect, it } from 'vitest';
import {
  assertChannelModeBelongsToFixture,
  assertValidPatchAddress,
  channelCountFromMode,
} from './project-fixture.validation';
import {
  ChannelModeFixtureMismatchException,
  DmxAddressOutOfRangeException,
  EmptyChannelModeException,
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
});
