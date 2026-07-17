/// <reference types="vitest/globals" />

import { fixtures } from './fixtures';

describe('seed data: fixtures', () => {
  it('contains the expected fixture fixtures', () => {
    expect(fixtures.length).toBeGreaterThan(0);
    for (const v of fixtures) {
      expect(v).toHaveProperty('publicId');
      expect(v).toHaveProperty('name');
    }
  });
});
