import { describe, expect, it } from 'vitest';
import { UpdateFixtureChannelAssignmentInput } from './update-fixture-channel-assignment.dto';
import { UpdateFixtureChannelModeInput } from './update-fixture-channel-mode.dto';

describe('UpdateFixtureChannelModeInput', () => {
  it('instantiates with undefined publicId (GraphQL nullable field, no runtime initializer)', () => {
    const input = new UpdateFixtureChannelModeInput();
    expect(input.publicId).toBeUndefined();
    input.name = '4 channel mode';
    input.assignments = [];
    expect(input.name).toBe('4 channel mode');
    expect(input.assignments).toEqual([]);
  });
});

describe('UpdateFixtureChannelAssignmentInput', () => {
  it('accepts a channel definition public ID', () => {
    const input = new UpdateFixtureChannelAssignmentInput();
    input.channelDefinitionPublicId = '00000000-0000-4000-8000-000000000000';
    expect(input.channelDefinitionPublicId).toBe('00000000-0000-4000-8000-000000000000');
  });
});
