import { AppModule } from '@/app.module';
import { SerialSendService } from '@/io/serial/serial-send.service';
import { graphqlQuery } from '@/testhelpers/graphql-test-client';
import { SEED_FIXTURE_PUBLIC_ID } from '@/testhelpers/seed-fixture-data';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import gql from 'graphql-tag';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

type CreateFixtureVendorMutation = {
  createFixtureVendor: {
    name: string;
    publicId: string;
  };
};

type UpdateFixtureMutation = {
  updateFixture: {
    name: string;
    publicId: string;
  };
};

type DeleteFixtureVendorMutation = {
  deleteFixtureVendor: {
    deleted: boolean;
    publicId: string;
  };
};

const ORIGINAL_ENV = process.env;

describe('Fixture mutations', () => {
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

  it('should create a fixture vendor via createFixtureVendor', async () => {
    const mutation = gql`
      mutation ($input: CreateFixtureVendorInput!) {
        createFixtureVendor(input: $input) {
          name
          publicId
        }
      }
    `;

    const body = await graphqlQuery<CreateFixtureVendorMutation>(app.getHttpAdapter().getInstance().server, mutation, {
      variables: {
        input: {
          name: 'E2E Fixture Vendor',
        },
      },
    });

    expect(body.data?.createFixtureVendor.name).toBe('E2E Fixture Vendor');
    expect(body.data?.createFixtureVendor.publicId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('should update a fixture via updateFixture', async () => {
    const mutation = gql`
      mutation ($input: UpdateFixtureInput!) {
        updateFixture(input: $input) {
          name
          publicId
        }
      }
    `;

    const body = await graphqlQuery<UpdateFixtureMutation>(app.getHttpAdapter().getInstance().server, mutation, {
      variables: {
        input: {
          publicId: SEED_FIXTURE_PUBLIC_ID,
          name: 'Mega TriPar Profile Plus (E2E)',
        },
      },
    });

    expect(body.data?.updateFixture.publicId).toBe(SEED_FIXTURE_PUBLIC_ID);
    expect(body.data?.updateFixture.name).toBe('Mega TriPar Profile Plus (E2E)');
  });

  it('should delete a fixture vendor via deleteFixtureVendor', async () => {
    const createMutation = gql`
      mutation ($input: CreateFixtureVendorInput!) {
        createFixtureVendor(input: $input) {
          publicId
        }
      }
    `;

    const createBody = await graphqlQuery<CreateFixtureVendorMutation>(
      app.getHttpAdapter().getInstance().server,
      createMutation,
      {
        variables: {
          input: {
            name: 'Vendor To Delete',
          },
        },
      },
    );

    const publicId = createBody.data?.createFixtureVendor.publicId;
    expect(publicId).toBeDefined();

    const mutation = gql`
      mutation ($publicId: UUID!) {
        deleteFixtureVendor(publicId: $publicId) {
          deleted
          publicId
        }
      }
    `;

    const body = await graphqlQuery<DeleteFixtureVendorMutation>(app.getHttpAdapter().getInstance().server, mutation, {
      variables: {
        publicId,
      },
    });

    expect(body.data?.deleteFixtureVendor.publicId).toBe(publicId);
    expect(body.data?.deleteFixtureVendor.deleted).toBe(true);
  });
});
