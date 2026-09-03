import { describe, expect, it } from 'vitest';
import { mapProjectsToExportDocument } from './project-export.mapper';

const timestamps = {
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-02T00:00:00.000Z'),
};

describe('mapProjectsToExportDocument', () => {
  it('maps rows into a versioned document sorted by name', () => {
    expect(
      mapProjectsToExportDocument([
        { publicId: 'b', name: 'Zebra', projectFixtures: [], ...timestamps },
        { publicId: 'a', name: 'Alpha', projectFixtures: [], ...timestamps },
      ]),
    ).toEqual({
      schemaVersion: 2,
      projects: [
        { publicId: 'a', name: 'Alpha', projectFixtures: [], ...timestamps },
        { publicId: 'b', name: 'Zebra', projectFixtures: [], ...timestamps },
      ],
    });
  });

  it('maps nested project fixtures sorted by start address', () => {
    expect(
      mapProjectsToExportDocument([
        {
          publicId: 'p',
          name: 'Show',
          projectFixtures: [
            {
              publicId: 'pf-2',
              startAddress: 10,
              fixture: { publicId: 'f-1' },
              fixtureChannelMode: { publicId: 'm-1' },
              ...timestamps,
            },
            {
              publicId: 'pf-1',
              startAddress: 1,
              fixture: { publicId: 'f-1' },
              fixtureChannelMode: { publicId: 'm-1' },
              ...timestamps,
            },
          ],
          ...timestamps,
        },
      ]),
    ).toEqual({
      schemaVersion: 2,
      projects: [
        {
          publicId: 'p',
          name: 'Show',
          projectFixtures: [
            {
              publicId: 'pf-1',
              startAddress: 1,
              fixturePublicId: 'f-1',
              channelModePublicId: 'm-1',
              ...timestamps,
            },
            {
              publicId: 'pf-2',
              startAddress: 10,
              fixturePublicId: 'f-1',
              channelModePublicId: 'm-1',
              ...timestamps,
            },
          ],
          ...timestamps,
        },
      ],
    });
  });
});
