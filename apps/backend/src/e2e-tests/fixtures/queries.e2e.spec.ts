import { AppModule } from '@/app.module';
import { SerialSendService } from '@/io/serial/serial-send.service';
import { graphqlQuery } from '@/testhelpers/graphql-test-client';
import { SEED_FIXTURE_PUBLIC_ID } from '@/testhelpers/seed-fixture-data';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
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

const ORIGINAL_ENV = process.env;
const UNKNOWN_FIXTURE_PUBLIC_ID = '00000000-0000-4000-8000-000000000000';

describe('Fixture queries', () => {
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

    const fixture = body.data?.fixtures.find(entry => entry.publicId === SEED_FIXTURE_PUBLIC_ID);
    if (!fixture) {
      throw new Error(`Expected fixture with publicId ${SEED_FIXTURE_PUBLIC_ID}`);
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
        publicId: SEED_FIXTURE_PUBLIC_ID,
      },
    });

    expect(body.data?.fixture?.publicId).toBe(SEED_FIXTURE_PUBLIC_ID);
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
});
