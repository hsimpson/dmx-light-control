import { createEuroliteVendor, setupCatalogFixture, type CatalogFixture } from './catalog-fixture';
import { createE2eApp } from '@/testhelpers/e2e-app';
import { graphqlQuery } from '@/testhelpers/graphql-test-client';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import gql from 'graphql-tag';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

type FixtureVendorsQuery = {
  fixtureVendors: {
    createdAt: string;
    name: string;
    publicId: string;
    updatedAt: string;
  }[];
};

type FixturesQuery = {
  fixtures: {
    name: string;
    publicId: string;
    fixtureVendor: {
      name: string;
      publicId: string;
    };
  }[];
};

type FixtureQuery = {
  fixture: {
    name: string;
    publicId: string;
    fixtureVendor: {
      name: string;
      publicId: string;
    };
  } | null;
};

type FixtureWithModeAssignmentsQuery = {
  fixture: {
    publicId: string;
    fixtureChannelModes: {
      name: string;
      fixtureChannelAssignments: {
        channelNumber: number;
        fixtureChannelDefinition: {
          name: string;
          order: number;
          publicId: string;
          preset: string;
        };
      }[];
    }[];
  } | null;
};

const UNKNOWN_FIXTURE_PUBLIC_ID = '00000000-0000-4000-8000-000000000000';

describe('Fixture queries', () => {
  let app: NestFastifyApplication;
  let catalog: CatalogFixture;

  beforeAll(async () => {
    app = await createE2eApp();

    const server = app.getHttpAdapter().getInstance().server;
    await createEuroliteVendor(server);
    catalog = await setupCatalogFixture(server, { fixtureName: 'E2E Queries Catalog Par' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return a list of fixtureVendors', async () => {
    const query = gql`
      query {
        fixtureVendors {
          createdAt
          name
          publicId
          updatedAt
        }
      }
    `;

    const body = await graphqlQuery<FixtureVendorsQuery>(app.getHttpAdapter().getInstance().server, query);

    expect(body.data?.fixtureVendors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'American DJ' }),
        expect.objectContaining({ name: 'eurolite' }),
      ]),
    );
  });

  it('should return a list of fixtures', async () => {
    const query = gql`
      query {
        fixtures {
          name
          publicId
          fixtureVendor {
            name
            publicId
          }
        }
      }
    `;

    const body = await graphqlQuery<FixturesQuery>(app.getHttpAdapter().getInstance().server, query);

    const fixture = body.data?.fixtures.find(entry => entry.publicId === catalog.fixturePublicId);
    if (!fixture) {
      throw new Error(`Expected fixture with publicId ${catalog.fixturePublicId}`);
    }
    expect(fixture.fixtureVendor.name).toBe('American DJ');
  });

  it('should return a fixture by publicId', async () => {
    const query = gql`
      query ($publicId: UUID!) {
        fixture(publicId: $publicId) {
          name
          publicId
          fixtureVendor {
            name
            publicId
          }
        }
      }
    `;

    const body = await graphqlQuery<FixtureQuery>(app.getHttpAdapter().getInstance().server, query, {
      variables: {
        publicId: catalog.fixturePublicId,
      },
    });

    expect(body.data?.fixture?.publicId).toBe(catalog.fixturePublicId);
    expect(body.data?.fixture?.fixtureVendor.name).toBe('American DJ');
  });

  it('should return null for an unknown fixture publicId', async () => {
    const query = gql`
      query ($publicId: UUID!) {
        fixture(publicId: $publicId) {
          publicId
        }
      }
    `;

    const body = await graphqlQuery<FixtureQuery>(app.getHttpAdapter().getInstance().server, query, {
      variables: {
        publicId: UNKNOWN_FIXTURE_PUBLIC_ID,
      },
    });

    expect(body.data?.fixture).toBeNull();
  });

  it('should return channel definitions on mode channel assignments', async () => {
    const query = gql`
      query ($publicId: UUID!) {
        fixture(publicId: $publicId) {
          publicId
          fixtureChannelModes {
            name
            fixtureChannelAssignments {
              channelNumber
              fixtureChannelDefinition {
                name
                order
                publicId
                preset
              }
            }
          }
        }
      }
    `;

    const body = await graphqlQuery<FixtureWithModeAssignmentsQuery>(app.getHttpAdapter().getInstance().server, query, {
      variables: {
        publicId: catalog.fixturePublicId,
      },
    });

    const modes = body.data?.fixture?.fixtureChannelModes ?? [];
    expect(modes.length).toBeGreaterThan(0);

    const assignments = modes.flatMap(mode => mode.fixtureChannelAssignments);
    expect(assignments.length).toBeGreaterThan(0);
    for (const assignment of assignments) {
      expect(assignment.fixtureChannelDefinition.publicId).toBeTruthy();
      expect(assignment.fixtureChannelDefinition.name).toBeTruthy();
      expect(assignment.fixtureChannelDefinition.preset).toBeTruthy();
    }
  });
});
