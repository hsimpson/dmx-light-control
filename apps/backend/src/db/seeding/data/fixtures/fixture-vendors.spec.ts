import { describe, it, expect } from 'vitest';
import { fixtureVendors } from './fixture-vendors';

describe('seed data: fixtureVendors', () => {
  it('contains the expected vendor fixtures', () => {
    expect(fixtureVendors.length).toBeGreaterThan(0);
    for (const v of fixtureVendors) {
      expect(v).toHaveProperty('publicId');
      expect(v).toHaveProperty('name');
    }
  });
});
