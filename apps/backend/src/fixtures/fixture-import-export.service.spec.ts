import { describe, expect, it, vi } from 'vitest';
import { FixtureChannelPreset } from './channel-presets';
import { FixtureImportExportService } from './fixture-import-export.service';
import { FixtureImportInvalidException } from './fixture.exceptions';
import { FixtureVendorRepository } from './repositories/fixture-vendor.repository';
import { FixtureRepository } from './repositories/fixture.repository';

const timestamps = {
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-02T00:00:00.000Z'),
};

describe('FixtureImportExportService', () => {
  it('exportFixtures maps repository rows into a versioned document', async () => {
    const fixtureRepository = {
      findMany: vi.fn().mockResolvedValue([
        {
          publicId: 'fix-1',
          name: 'Spot',
          ...timestamps,
          fixtureVendor: { publicId: 'vendor-1', name: 'Acme', ...timestamps },
          fixtureChannelDefinitions: [
            {
              publicId: 'def-1',
              name: 'Dimmer',
              order: 0,
              preset: FixtureChannelPreset.IntensityDimmer,
              ...timestamps,
              fixtureChannelRanges: [],
            },
          ],
          fixtureChannelModes: [],
        },
      ]),
    };
    const fixtureVendorRepository = {
      findMany: vi.fn().mockResolvedValue([
        { publicId: 'vendor-1', name: 'Acme', ...timestamps },
        { publicId: 'vendor-2', name: 'eurolite', ...timestamps },
      ]),
    };
    const service = new FixtureImportExportService(
      {} as never,
      fixtureRepository as unknown as FixtureRepository,
      fixtureVendorRepository as unknown as FixtureVendorRepository,
    );

    await expect(service.exportFixtures()).resolves.toEqual({
      schemaVersion: 1,
      vendors: [
        { publicId: 'vendor-1', name: 'Acme', ...timestamps },
        { publicId: 'vendor-2', name: 'eurolite', ...timestamps },
      ],
      fixtures: [
        {
          publicId: 'fix-1',
          name: 'Spot',
          ...timestamps,
          vendor: { publicId: 'vendor-1', name: 'Acme', ...timestamps },
          channelDefinitions: [
            {
              publicId: 'def-1',
              name: 'Dimmer',
              order: 0,
              preset: FixtureChannelPreset.IntensityDimmer,
              ...timestamps,
              ranges: [],
            },
          ],
          channelModes: [],
        },
      ],
    });
  });

  it('importFixtures rejects an unsupported schemaVersion before opening a transaction', async () => {
    const transaction = vi.fn();
    const service = new FixtureImportExportService(
      { transaction } as never,
      { findMany: vi.fn() } as unknown as FixtureRepository,
      { findMany: vi.fn() } as unknown as FixtureVendorRepository,
    );

    await expect(
      service.importFixtures({
        schemaVersion: 2,
        fixtures: [],
      }),
    ).rejects.toBeInstanceOf(FixtureImportInvalidException);
    expect(transaction).not.toHaveBeenCalled();
  });
});
