import { describe, expect, it } from 'vitest';
import { FixtureChannelPreset } from './channel-presets';
import { FIXTURE_EXPORT_SCHEMA_VERSION, mapFixturesToExportDocument } from './fixture-export.mapper';

const timestamps = {
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-02T00:00:00.000Z'),
};

describe('mapFixturesToExportDocument', () => {
  it('maps the fixture graph into a versioned document without nested definition copies', () => {
    const document = mapFixturesToExportDocument([
      {
        publicId: 'fix-1',
        name: 'Spot',
        ...timestamps,
        fixtureVendor: { publicId: 'vendor-1', name: 'Acme', ...timestamps },
        fixtureChannelDefinitions: [
          {
            publicId: 'def-dimmer',
            name: 'Dimmer',
            order: 1,
            preset: FixtureChannelPreset.IntensityDimmer,
            ...timestamps,
            fixtureChannelRanges: [
              {
                publicId: 'range-2',
                dmxStart: 128,
                dmxEnd: 255,
                description: 'high',
                ...timestamps,
              },
              {
                publicId: 'range-1',
                dmxStart: 0,
                dmxEnd: 127,
                description: 'low',
                ...timestamps,
              },
            ],
          },
          {
            publicId: 'def-red',
            name: 'Red',
            order: 0,
            preset: FixtureChannelPreset.IntensityRed,
            ...timestamps,
            fixtureChannelRanges: [],
          },
        ],
        fixtureChannelModes: [
          {
            publicId: 'mode-2',
            name: '2ch',
            order: 1,
            ...timestamps,
            fixtureChannelAssignments: [
              {
                channelNumber: 2,
                fixtureChannelDefinition: { publicId: 'def-dimmer' },
                ...timestamps,
              },
              {
                channelNumber: 1,
                fixtureChannelDefinition: { publicId: 'def-red' },
                ...timestamps,
              },
            ],
          },
        ],
      },
    ]);

    expect(document.schemaVersion).toBe(FIXTURE_EXPORT_SCHEMA_VERSION);
    expect(document.vendors).toEqual([{ publicId: 'vendor-1', name: 'Acme', ...timestamps }]);
    expect(document.fixtures).toEqual([
      {
        publicId: 'fix-1',
        name: 'Spot',
        ...timestamps,
        vendor: { publicId: 'vendor-1', name: 'Acme', ...timestamps },
        channelDefinitions: [
          {
            publicId: 'def-red',
            name: 'Red',
            order: 0,
            preset: FixtureChannelPreset.IntensityRed,
            ...timestamps,
            ranges: [],
          },
          {
            publicId: 'def-dimmer',
            name: 'Dimmer',
            order: 1,
            preset: FixtureChannelPreset.IntensityDimmer,
            ...timestamps,
            ranges: [
              {
                publicId: 'range-1',
                dmxStart: 0,
                dmxEnd: 127,
                description: 'low',
                ...timestamps,
              },
              {
                publicId: 'range-2',
                dmxStart: 128,
                dmxEnd: 255,
                description: 'high',
                ...timestamps,
              },
            ],
          },
        ],
        channelModes: [
          {
            publicId: 'mode-2',
            name: '2ch',
            order: 1,
            ...timestamps,
            assignments: [
              {
                channelNumber: 1,
                channelDefinitionPublicId: 'def-red',
                ...timestamps,
              },
              {
                channelNumber: 2,
                channelDefinitionPublicId: 'def-dimmer',
                ...timestamps,
              },
            ],
          },
        ],
      },
    ]);
  });

  it('treats missing nested collections as empty arrays', () => {
    const document = mapFixturesToExportDocument([{ publicId: 'fix-1', name: 'Empty', ...timestamps }]);
    expect(document.fixtures[0]?.vendor).toEqual({
      publicId: '',
      name: '',
      createdAt: new Date(0),
      updatedAt: new Date(0),
    });
    expect(document.fixtures[0]?.channelDefinitions).toEqual([]);
    expect(document.fixtures[0]?.channelModes).toEqual([]);
  });

  it('includes unused vendors supplied separately from fixtures', () => {
    const document = mapFixturesToExportDocument(
      [
        {
          publicId: 'fix-1',
          name: 'Spot',
          ...timestamps,
          fixtureVendor: { publicId: 'vendor-1', name: 'Acme', ...timestamps },
        },
      ],
      [
        { publicId: 'vendor-2', name: 'eurolite', ...timestamps },
        { publicId: 'vendor-1', name: 'Acme', ...timestamps },
      ],
    );

    expect(document.vendors).toEqual([
      { publicId: 'vendor-1', name: 'Acme', ...timestamps },
      { publicId: 'vendor-2', name: 'eurolite', ...timestamps },
    ]);
  });
});
