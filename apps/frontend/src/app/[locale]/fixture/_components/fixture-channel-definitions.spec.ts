import { FixtureChannelDefinition } from '@/shared/types/fixtures';
import { FixtureChannelPreset } from '@/shared/types/graphql/graphql';
import { describe, expect, it } from 'vitest';
import {
  EditorChannelDefinition,
  toChannelDefinitionSaveInputs,
  toEditorChannelDefinitions,
} from './fixture-channel-definitions';

const now = new Date('2026-01-01T00:00:00.000Z');

function definition(
  overrides: Partial<FixtureChannelDefinition> & Pick<FixtureChannelDefinition, 'publicId' | 'name' | 'order'>,
): FixtureChannelDefinition {
  return {
    preset: FixtureChannelPreset.Custom,
    createdAt: now,
    updatedAt: now,
    fixtureChannelRanges: [],
    ...overrides,
  };
}

describe('toEditorChannelDefinitions', () => {
  it('sorts by order and sets clientKey from publicId', () => {
    const result = toEditorChannelDefinitions([
      definition({ publicId: 'b', name: 'Blue', order: 2 }),
      definition({ publicId: 'r', name: 'Red', order: 0 }),
      definition({ publicId: 'g', name: 'Green', order: 1 }),
    ]);

    expect(result.map(item => item.publicId)).toEqual(['r', 'g', 'b']);
    expect(result.map(item => item.clientKey)).toEqual(['r', 'g', 'b']);
  });
});

describe('toChannelDefinitionSaveInputs', () => {
  it('drops rows without publicId and only sends publicId and name', () => {
    const persisted: EditorChannelDefinition = {
      ...definition({ publicId: 'r', name: 'Red', order: 0 }),
      clientKey: 'r',
    };
    const unsaved: EditorChannelDefinition = {
      clientKey: 'new',
      name: 'Amber',
      order: 1,
      preset: FixtureChannelPreset.Custom,
      createdAt: now,
      updatedAt: now,
      fixtureChannelRanges: [],
    };

    expect(toChannelDefinitionSaveInputs([persisted, unsaved])).toEqual([{ publicId: 'r', name: 'Red' }]);
  });
});
