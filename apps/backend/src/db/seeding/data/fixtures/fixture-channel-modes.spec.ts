/// <reference types="vitest/globals" />

import { fixtureChannelModes } from './fixture-channel-modes';

describe('seed data: fixtureChannelModes', () => {
  it('contains the expected fixture channel mode fixtures', () => {
    expect(fixtureChannelModes.length).toBeGreaterThan(0);
    for (const v of fixtureChannelModes) {
      expect(v).toHaveProperty('publicId');
      expect(v).toHaveProperty('name');
    }
  });
});
