/// <reference types="vitest/globals" />

import { fixtureChannelAssignments } from './fixture-channel-assignment';

describe('seed data: fixtureChannelAssignments', () => {
  it('contains the expected fixture channel assignment fixtures', () => {
    expect(fixtureChannelAssignments.length).toBeGreaterThan(0);
    for (const v of fixtureChannelAssignments) {
      expect(v).toHaveProperty('publicId');
      expect(v).toHaveProperty('channelNumber');
    }
  });
});
