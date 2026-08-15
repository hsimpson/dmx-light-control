import { FixtureChannelMode } from '@/shared/types/fixtures';
import { FixtureChannelPreset } from '@/shared/types/graphql/graphql';
import { describe, expect, it } from 'vitest';
import { EditorChannelDefinition } from './fixture-channel-definitions';
import { EditorChannelMode, toChannelModeSaveInputs, toEditorChannelModes } from './fixture-channel-modes';

const now = new Date('2026-01-01T00:00:00.000Z');

const redDefinition: EditorChannelDefinition = {
  publicId: 'def-red',
  clientKey: 'def-red',
  name: 'Red',
  order: 0,
  preset: FixtureChannelPreset.Custom,
  createdAt: now,
  updatedAt: now,
  fixtureChannelRanges: [],
};

describe('toEditorChannelModes', () => {
  it('sorts modes by order and assignments by channelNumber', () => {
    const modes: FixtureChannelMode[] = [
      {
        publicId: 'mode-8',
        name: '8ch',
        order: 1,
        createdAt: now,
        updatedAt: now,
        fixtureChannelAssignments: [
          {
            publicId: 'a2',
            channelNumber: 2,
            createdAt: now,
            updatedAt: now,
            fixtureChannelDefinition: { ...redDefinition, publicId: 'def-red' },
          },
          {
            publicId: 'a1',
            channelNumber: 1,
            createdAt: now,
            updatedAt: now,
            fixtureChannelDefinition: { ...redDefinition, publicId: 'def-red' },
          },
        ],
      },
      {
        publicId: 'mode-4',
        name: '4ch',
        order: 0,
        createdAt: now,
        updatedAt: now,
        fixtureChannelAssignments: [],
      },
    ];

    const result = toEditorChannelModes(modes);

    expect(result.map(mode => mode.publicId)).toEqual(['mode-4', 'mode-8']);
    expect(result[1]?.fixtureChannelAssignments.map(assignment => assignment.channelNumber)).toEqual([1, 2]);
    expect(result[1]?.fixtureChannelAssignments.map(assignment => assignment.clientKey)).toEqual(['a1', 'a2']);
  });
});

describe('toChannelModeSaveInputs', () => {
  it('omits assignments whose definition has no publicId', () => {
    const unsavedDefinition: EditorChannelDefinition = { ...redDefinition, publicId: undefined, clientKey: 'new-def' };
    const mode: EditorChannelMode = {
      publicId: 'mode-8',
      clientKey: 'mode-8',
      name: '8ch',
      order: 0,
      fixtureChannelAssignments: [
        {
          clientKey: 'a1',
          publicId: 'a1',
          channelNumber: 1,
          fixtureChannelDefinition: redDefinition,
        },
        {
          clientKey: 'a2',
          channelNumber: 2,
          fixtureChannelDefinition: unsavedDefinition,
        },
      ],
    };

    expect(toChannelModeSaveInputs([mode])).toEqual([
      {
        publicId: 'mode-8',
        name: '8ch',
        assignments: [{ channelDefinitionPublicId: 'def-red' }],
      },
    ]);
  });

  it('emits name and assignments for modes without publicId', () => {
    const mode: EditorChannelMode = {
      clientKey: 'new-mode',
      name: '16ch',
      order: 0,
      fixtureChannelAssignments: [
        {
          clientKey: 'a1',
          channelNumber: 1,
          fixtureChannelDefinition: redDefinition,
        },
      ],
    };

    expect(toChannelModeSaveInputs([mode])).toEqual([
      {
        name: '16ch',
        assignments: [{ channelDefinitionPublicId: 'def-red' }],
      },
    ]);
  });
});
