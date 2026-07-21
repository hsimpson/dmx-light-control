import { AppModule } from '@/app.module';
import { graphqlQuery } from '@/e2e-tests/graphql-test-client';
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

const ORIGINAL_ENV = process.env;

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
    }).compile();

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

    expect(body.data?.fixtureVendors).toBeDefined();
  });
});
