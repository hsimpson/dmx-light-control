import { describe, it, expect } from 'vitest';
import { fixtureChannelDefinitions } from './fixture-channel-definitions';

describe('seed data: fixtureChannelDefinitions', () => {
  it('contains the expected fixture channel definition fixtures', () => {
    expect(fixtureChannelDefinitions.length).toBeGreaterThan(0);
    for (const v of fixtureChannelDefinitions) {
      expect(v).toHaveProperty('publicId');
      expect(v).toHaveProperty('name');
    }
  });
});
