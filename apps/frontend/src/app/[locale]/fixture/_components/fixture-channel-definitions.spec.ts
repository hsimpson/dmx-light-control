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
  it('sends publicId, name, preset and ranges; rows without publicId are created', () => {
    const persisted: EditorChannelDefinition = {
      ...definition({
        publicId: 'r',
        name: 'Red',
        order: 0,
        fixtureChannelRanges: [
          { publicId: 'range-1', dmxStart: 0, dmxEnd: 255, description: 'off-full', createdAt: now, updatedAt: now },
        ],
      }),
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

    expect(toChannelDefinitionSaveInputs([persisted, unsaved])).toEqual([
      {
        publicId: 'r',
        name: 'Red',
        preset: FixtureChannelPreset.Custom,
        order: 0,
        ranges: [{ publicId: 'range-1', dmxStart: 0, dmxEnd: 255, description: 'off-full' }],
      },
      { name: 'Amber', preset: FixtureChannelPreset.Custom, order: 1, ranges: [] },
    ]);
  });

  it('derives order from list position so reordering is persisted', () => {
    const first: EditorChannelDefinition = {
      ...definition({ publicId: 'r', name: 'Red', order: 0 }),
      clientKey: 'r',
    };
    const second: EditorChannelDefinition = {
      ...definition({ publicId: 'g', name: 'Green', order: 1 }),
      clientKey: 'g',
    };

    const reordered = toChannelDefinitionSaveInputs([second, first]);

    expect(reordered.map(item => item.order)).toEqual([0, 1]);
    expect(reordered.map(item => item.name)).toEqual(['Green', 'Red']);
  });
});
