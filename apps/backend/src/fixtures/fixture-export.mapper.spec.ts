import { describe, expect, it } from 'vitest';
import { FixtureChannelPreset } from './channel-presets';
import { FIXTURE_EXPORT_SCHEMA_VERSION, mapFixturesToExportDocument } from './fixture-export.mapper';

describe('mapFixturesToExportDocument', () => {
  it('maps the fixture graph into a versioned document without nested definition copies', () => {
    const document = mapFixturesToExportDocument([
      {
        publicId: 'fix-1',
        name: 'Spot',
        fixtureVendor: { publicId: 'vendor-1', name: 'Acme' },
        fixtureChannelDefinitions: [
          {
            publicId: 'def-dimmer',
            name: 'Dimmer',
            order: 1,
            preset: FixtureChannelPreset.IntensityDimmer,
            fixtureChannelRanges: [
              { publicId: 'range-2', dmxStart: 128, dmxEnd: 255, description: 'high' },
              { publicId: 'range-1', dmxStart: 0, dmxEnd: 127, description: 'low' },
            ],
          },
          {
            publicId: 'def-red',
            name: 'Red',
            order: 0,
            preset: FixtureChannelPreset.IntensityRed,
            fixtureChannelRanges: [],
          },
        ],
        fixtureChannelModes: [
          {
            publicId: 'mode-2',
            name: '2ch',
            order: 1,
            fixtureChannelAssignments: [
              { channelNumber: 2, fixtureChannelDefinition: { publicId: 'def-dimmer' } },
              { channelNumber: 1, fixtureChannelDefinition: { publicId: 'def-red' } },
            ],
          },
        ],
      },
    ]);

    expect(document.schemaVersion).toBe(FIXTURE_EXPORT_SCHEMA_VERSION);
    expect(document.vendors).toEqual([{ publicId: 'vendor-1', name: 'Acme' }]);
    expect(document.fixtures).toEqual([
      {
        publicId: 'fix-1',
        name: 'Spot',
        vendor: { publicId: 'vendor-1', name: 'Acme' },
        channelDefinitions: [
          {
            publicId: 'def-red',
            name: 'Red',
            order: 0,
            preset: FixtureChannelPreset.IntensityRed,
            ranges: [],
          },
          {
            publicId: 'def-dimmer',
            name: 'Dimmer',
            order: 1,
            preset: FixtureChannelPreset.IntensityDimmer,
            ranges: [
              { publicId: 'range-1', dmxStart: 0, dmxEnd: 127, description: 'low' },
              { publicId: 'range-2', dmxStart: 128, dmxEnd: 255, description: 'high' },
            ],
          },
        ],
        channelModes: [
          {
            publicId: 'mode-2',
            name: '2ch',
            order: 1,
            assignments: [
              { channelNumber: 1, channelDefinitionPublicId: 'def-red' },
              { channelNumber: 2, channelDefinitionPublicId: 'def-dimmer' },
            ],
          },
        ],
      },
    ]);
  });

  it('treats missing nested collections as empty arrays', () => {
    const document = mapFixturesToExportDocument([{ publicId: 'fix-1', name: 'Empty' }]);
    expect(document.fixtures[0]?.vendor).toEqual({ publicId: '', name: '' });
    expect(document.fixtures[0]?.channelDefinitions).toEqual([]);
    expect(document.fixtures[0]?.channelModes).toEqual([]);
  });

  it('includes unused vendors supplied separately from fixtures', () => {
    const document = mapFixturesToExportDocument(
      [{ publicId: 'fix-1', name: 'Spot', fixtureVendor: { publicId: 'vendor-1', name: 'Acme' } }],
      [
        { publicId: 'vendor-2', name: 'eurolite' },
        { publicId: 'vendor-1', name: 'Acme' },
      ],
    );

    expect(document.vendors).toEqual([
      { publicId: 'vendor-1', name: 'Acme' },
      { publicId: 'vendor-2', name: 'eurolite' },
    ]);
  });
});
