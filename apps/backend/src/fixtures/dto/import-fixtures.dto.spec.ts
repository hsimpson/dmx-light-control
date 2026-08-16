import { FixtureChannelPreset } from '@/fixtures/channel-presets';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { ImportFixtureRangeInput, ImportFixturesInput } from './import-fixtures.dto';

/** Stored in seed/export; RFC 4122 UUID with variant nibble `c`, so not UUID v4. */
const EXPORTED_RANGE_PUBLIC_ID = 'a4b9e7c8-5f1d-4a2b-c9e4-7f3a8d1b5c2f';

describe('ImportFixturesInput validation', () => {
  it('accepts exported range publicIds that are UUIDs but not version 4', async () => {
    const range = plainToInstance(ImportFixtureRangeInput, {
      publicId: EXPORTED_RANGE_PUBLIC_ID,
      dmxStart: 16,
      dmxEnd: 31,
      description: 'Mode 2',
    });
    expect(await validate(range)).toEqual([]);

    const document = plainToInstance(ImportFixturesInput, {
      schemaVersion: 1,
      fixtures: [
        {
          name: 'Spot',
          vendor: { name: 'Acme' },
          channelDefinitions: [
            {
              name: 'Macros',
              order: 0,
              preset: FixtureChannelPreset.Custom,
              ranges: [
                {
                  publicId: EXPORTED_RANGE_PUBLIC_ID,
                  dmxStart: 16,
                  dmxEnd: 31,
                  description: 'Mode 2',
                },
              ],
            },
          ],
          channelModes: [],
        },
      ],
    });
    expect(await validate(document)).toEqual([]);
  });

  it('rejects a publicId that is not UUID-shaped', async () => {
    const range = plainToInstance(ImportFixtureRangeInput, {
      publicId: 'not-a-uuid',
      dmxStart: 0,
      dmxEnd: 255,
      description: 'full',
    });
    const errors = await validate(range);
    expect(errors.some(error => error.property === 'publicId')).toBe(true);
  });
});
