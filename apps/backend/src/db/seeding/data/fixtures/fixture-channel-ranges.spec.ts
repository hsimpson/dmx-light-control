/// <reference types="vitest/globals" />

import { fixtureChannelRanges } from './fixture-channel-ranges';

describe('seed data: fixtureChannelRanges', () => {
  it('contains the expected fixture channel range fixtures', () => {
    expect(fixtureChannelRanges.length).toBeGreaterThan(0);
    for (const v of fixtureChannelRanges) {
      expect(v).toHaveProperty('publicId');
      expect(v).toHaveProperty('dmxStart');
    }
  });
});
