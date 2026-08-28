import { AppModule } from '@/app.module';
import { fixtureChannelDefinitions } from '@/db/seeding/data/fixtures/fixture-channel-definitions';
import { FixtureChannelPreset } from '@/fixtures/channel-presets';
import { SerialSendService } from '@/io/serial/serial-send.service';
import { graphqlQuery } from '@/testhelpers/graphql-test-client';
import { SEED_FIXTURE_PUBLIC_ID } from '@/testhelpers/seed-fixture-data';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import gql from 'graphql-tag';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const NEW_FIXTURE_PUBLIC_ID = '11111111-1111-4111-8111-111111111111';
const NEW_DEFINITION_PUBLIC_ID = '22222222-2222-4222-8222-222222222222';
const NEW_RANGE_PUBLIC_ID = '33333333-3333-4333-8333-333333333333';
const NEW_MODE_PUBLIC_ID = '44444444-4444-4444-8444-444444444444';
const UNUSED_VENDOR_PUBLIC_ID = '55555555-5555-4555-8555-555555555555';
const ROLLBACK_FIXTURE_PUBLIC_ID = '66666666-6666-4666-8666-666666666666';
const SEED_DEFINITION_PUBLIC_ID = fixtureChannelDefinitions[0]?.publicId;

type ExportFixturesQuery = {
  exportFixtures: {
    schemaVersion: number;
    vendors: { publicId: string; name: string; createdAt: string; updatedAt: string }[];
    fixtures: {
      publicId: string;
      name: string;
      createdAt: string;
      updatedAt: string;
      vendor: { publicId: string; name: string; createdAt: string; updatedAt: string };
      channelDefinitions: {
        publicId: string;
        name: string;
        order: number;
        preset: string;
        createdAt: string;
        updatedAt: string;
        ranges: {
          publicId: string;
          dmxStart: number;
          dmxEnd: number;
          description: string;
          createdAt: string;
          updatedAt: string;
        }[];
      }[];
      channelModes: {
        publicId: string;
        name: string;
        order: number;
        createdAt: string;
        updatedAt: string;
        assignments: {
          channelNumber: number;
          channelDefinitionPublicId: string;
          createdAt: string;
          updatedAt: string;
        }[];
      }[];
    }[];
  };
};

type ImportFixturesMutation = {
  importFixtures: {
    importedCount: number;
    fixtures: {
      publicId: string;
      name: string;
      fixtureVendor: { publicId: string; name: string };
      fixtureChannelDefinitions: { publicId: string; name: string }[];
    }[];
  };
};

type FixtureQuery = {
  fixture: {
    publicId: string;
    name: string;
    fixtureChannelDefinitions: { publicId: string; name: string }[];
  } | null;
};

const EXPORT_FIXTURES = gql`
  query {
    exportFixtures {
      schemaVersion
      vendors {
        publicId
        name
        createdAt
        updatedAt
      }
      fixtures {
        publicId
        name
        createdAt
        updatedAt
        vendor {
          publicId
          name
          createdAt
          updatedAt
        }
        channelDefinitions {
          publicId
          name
          order
          preset
          createdAt
          updatedAt
          ranges {
            publicId
            dmxStart
            dmxEnd
            description
            createdAt
            updatedAt
          }
        }
        channelModes {
          publicId
          name
          order
          createdAt
          updatedAt
          assignments {
            channelNumber
            channelDefinitionPublicId
            createdAt
            updatedAt
          }
        }
      }
    }
  }
`;

const IMPORT_FIXTURES = gql`
  mutation ($document: ImportFixturesInput!) {
    importFixtures(document: $document) {
      importedCount
      fixtures {
        publicId
        name
        fixtureVendor {
          publicId
          name
        }
        fixtureChannelDefinitions {
          publicId
          name
        }
      }
    }
  }
`;

const GET_FIXTURE = gql`
  query ($publicId: UUID!) {
    fixture(publicId: $publicId) {
      publicId
      name
      fixtureChannelDefinitions {
        publicId
        name
      }
    }
  }
`;

const ORIGINAL_ENV = process.env;

function newFixtureDocument(name = 'Import Test Par') {
  return {
    schemaVersion: 1,
    fixtures: [
      {
        publicId: NEW_FIXTURE_PUBLIC_ID,
        name,
        vendor: { publicId: UNUSED_VENDOR_PUBLIC_ID, name: 'American DJ' },
        channelDefinitions: [
          {
            publicId: NEW_DEFINITION_PUBLIC_ID,
            name: 'Dimmer',
            order: 0,
            preset: FixtureChannelPreset.IntensityDimmer,
            ranges: [
              {
                publicId: NEW_RANGE_PUBLIC_ID,
                dmxStart: 0,
                dmxEnd: 255,
                description: 'full',
              },
            ],
          },
        ],
        channelModes: [
          {
            publicId: NEW_MODE_PUBLIC_ID,
            name: '1ch',
            order: 0,
            assignments: [{ channelNumber: 1, channelDefinitionPublicId: NEW_DEFINITION_PUBLIC_ID }],
          },
        ],
      },
    ],
  };
}

describe('Fixture import/export', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    process.env = {
      ...ORIGINAL_ENV,
      BACKEND_PORT: '3000',
      POSTGRES_USER: 'u',
      POSTGRES_PASSWORD: 'p',
      POSTGRES_HOST: 'h',
      POSTGRES_PORT: '5432',
      POSTGRES_DB: 'db',
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SerialSendService)
      .useValue({
        onModuleInit: () => undefined,
        onModuleDestroy: () => undefined,
      })
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
    process.env = ORIGINAL_ENV;
  });

  it('exports every fixture with related vendor, definitions, ranges, modes, and assignments', async () => {
    const body = await graphqlQuery<ExportFixturesQuery>(app.getHttpAdapter().getInstance().server, EXPORT_FIXTURES);
    const document = body.data?.exportFixtures;
    expect(document?.schemaVersion).toBe(1);
    expect(document?.vendors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'American DJ' }),
        expect.objectContaining({ name: 'eurolite' }),
      ]),
    );

    const seed = document?.fixtures.find(entry => entry.publicId === SEED_FIXTURE_PUBLIC_ID);
    expect(seed?.name).toBeTruthy();
    expect(seed?.vendor.name).toBe('American DJ');
    expect(seed?.channelDefinitions.length).toBeGreaterThan(0);
    expect(seed?.channelDefinitions.some(definition => definition.ranges.length > 0)).toBe(true);
    expect(seed?.channelModes.length).toBeGreaterThan(0);
    expect(seed?.channelModes.some(mode => mode.assignments.length > 0)).toBe(true);
    expect(seed?.createdAt).toBeTruthy();
    expect(seed?.updatedAt).toBeTruthy();
    expect(seed?.vendor.createdAt).toBeTruthy();
    expect(seed?.channelDefinitions[0]?.createdAt).toBeTruthy();
    expect(seed?.channelModes[0]?.assignments[0]?.createdAt).toBeTruthy();
  });

  it('imports a new fixture, reuses an existing vendor by name, and upserts by publicId', async () => {
    const created = await graphqlQuery<ImportFixturesMutation>(
      app.getHttpAdapter().getInstance().server,
      IMPORT_FIXTURES,
      { variables: { document: newFixtureDocument() } },
    );

    expect(created.errors).toBeUndefined();
    expect(created.data?.importFixtures.importedCount).toBe(1);
    const imported = created.data?.importFixtures.fixtures[0];
    expect(imported?.publicId).toBe(NEW_FIXTURE_PUBLIC_ID);
    expect(imported?.fixtureVendor.name).toBe('American DJ');
    expect(imported?.fixtureVendor.publicId).not.toBe(UNUSED_VENDOR_PUBLIC_ID);
    expect(imported?.fixtureChannelDefinitions[0]?.name).toBe('Dimmer');

    const renamed = {
      ...newFixtureDocument(),
      fixtures: newFixtureDocument().fixtures.map(entry => ({
        ...entry,
        channelDefinitions: entry.channelDefinitions.map(definition => ({
          ...definition,
          name: 'Dimmer upserted',
        })),
      })),
    };
    const updated = await graphqlQuery<ImportFixturesMutation>(
      app.getHttpAdapter().getInstance().server,
      IMPORT_FIXTURES,
      { variables: { document: renamed } },
    );
    expect(updated.errors).toBeUndefined();
    expect(updated.data?.importFixtures.fixtures[0]?.fixtureChannelDefinitions[0]?.name).toBe('Dimmer upserted');

    const conflict = await graphqlQuery<ImportFixturesMutation>(
      app.getHttpAdapter().getInstance().server,
      IMPORT_FIXTURES,
      {
        variables: {
          document: {
            schemaVersion: 1,
            fixtures: [
              {
                publicId: SEED_FIXTURE_PUBLIC_ID,
                name: 'Import Test Par',
                vendor: { name: 'American DJ' },
                channelDefinitions: [],
                channelModes: [],
              },
            ],
          },
        },
      },
    );
    expect(conflict.errors?.[0]?.message).toContain('different fixtures');
  });

  it('imports vendors that are not referenced by any fixture', async () => {
    const standaloneVendorPublicId = '77777777-7777-4777-8777-777777777777';
    const body = await graphqlQuery<ImportFixturesMutation>(
      app.getHttpAdapter().getInstance().server,
      IMPORT_FIXTURES,
      {
        variables: {
          document: {
            schemaVersion: 1,
            vendors: [{ publicId: standaloneVendorPublicId, name: 'Standalone Import Vendor' }],
            fixtures: [],
          },
        },
      },
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.importFixtures.importedCount).toBe(0);

    const vendors = await graphqlQuery<{ fixtureVendors: { publicId: string; name: string }[] }>(
      app.getHttpAdapter().getInstance().server,
      gql`
        query {
          fixtureVendors {
            publicId
            name
          }
        }
      `,
    );
    expect(vendors.data?.fixtureVendors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ publicId: standaloneVendorPublicId, name: 'Standalone Import Vendor' }),
      ]),
    );
  });

  it('rejects an unknown schemaVersion', async () => {
    const body = await graphqlQuery<ImportFixturesMutation>(
      app.getHttpAdapter().getInstance().server,
      IMPORT_FIXTURES,
      { variables: { document: { schemaVersion: 2, fixtures: [] } } },
    );

    expect(body.errors?.[0]?.message).toContain('schemaVersion');
  });

  it('rolls back the whole import when a later insert violates uniqueness', async () => {
    const body = await graphqlQuery<ImportFixturesMutation>(
      app.getHttpAdapter().getInstance().server,
      IMPORT_FIXTURES,
      {
        variables: {
          document: {
            schemaVersion: 1,
            fixtures: [
              {
                publicId: ROLLBACK_FIXTURE_PUBLIC_ID,
                name: 'Rollback Fixture',
                vendor: { name: 'American DJ' },
                channelDefinitions: [
                  {
                    publicId: SEED_DEFINITION_PUBLIC_ID,
                    name: 'Dimmer',
                    order: 0,
                    preset: FixtureChannelPreset.IntensityDimmer,
                    ranges: [],
                  },
                ],
                channelModes: [],
              },
            ],
          },
        },
      },
    );

    expect(body.errors).toBeDefined();
    const created = await graphqlQuery<FixtureQuery>(app.getHttpAdapter().getInstance().server, GET_FIXTURE, {
      variables: { publicId: ROLLBACK_FIXTURE_PUBLIC_ID },
    });
    expect(created.data?.fixture).toBeNull();
  });
});
