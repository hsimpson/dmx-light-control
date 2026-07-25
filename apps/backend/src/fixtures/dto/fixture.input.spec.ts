import { describe, it, expect } from 'vitest';
import { UpdateFixtureVendorInput } from './fixture.input';

describe('UpdateFixtureVendorInput', () => {
  it('instantiates with undefined fields (GraphQL nullable fields, no runtime initializer)', () => {
    const input = new UpdateFixtureVendorInput();
    expect(input.publicId).toBeUndefined();
    expect(input.name).toBeUndefined();
    input.publicId = '00000000-0000-0000-0000-000000000000';
    input.name = 'Acme';
    expect(input.publicId).toBe('00000000-0000-0000-0000-000000000000');
    expect(input.name).toBe('Acme');
  });
});
