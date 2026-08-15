import { describe, expect, it } from 'vitest';
import { UpdateFixtureChannelDefinitionInput } from './update-fixture-channel-definition.dto';

describe('UpdateFixtureChannelDefinitionInput', () => {
  it('accepts a publicId and name', () => {
    const input = new UpdateFixtureChannelDefinitionInput();
    input.publicId = 'aa597568-bbec-48c1-958b-6e383be5dc2d';
    input.name = 'Red';
    expect(input.publicId).toBe('aa597568-bbec-48c1-958b-6e383be5dc2d');
    expect(input.name).toBe('Red');
  });
});
