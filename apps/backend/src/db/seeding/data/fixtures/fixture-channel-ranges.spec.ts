import { describe, it, expect } from 'vitest';
import { fixtureChannelRanges } from './fixture-channel-ranges';

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('seed data: fixtureChannelRanges', () => {
  it('contains the expected fixture channel range fixtures', () => {
    expect(fixtureChannelRanges.length).toBeGreaterThan(0);
    const publicIds = fixtureChannelRanges.map(range => range.publicId);
    expect(new Set(publicIds).size).toBe(publicIds.length);
    for (const v of fixtureChannelRanges) {
      expect(v).toHaveProperty('publicId');
      expect(v.publicId).toMatch(UUID_V4_PATTERN);
      expect(v).toHaveProperty('dmxStart');
    }
  });
});
