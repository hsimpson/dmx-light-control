import { AppModule } from '@/app.module';
import { SerialSendService } from '@/io/serial/serial-send.service';
import { graphqlQuery } from '@/testhelpers/graphql-test-client';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import gql from 'graphql-tag';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

type SetChannelValuesMutation = {
  setChannelValues: string;
};

const ORIGINAL_ENV = process.env;

describe('DMX E2E Tests', () => {
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

  it('should setChannelValues', async () => {
    const mutation = gql`
      mutation ($channelValues: ChannelValuesInput!) {
        setChannelValues(channelValues: $channelValues)
      }
    `;

    const variables = {
      channelValues: {
        dmxValues: [
          { channel: 1, value: 127 },
          { channel: 5, value: 32 },
        ],
      },
    };

    const body = await graphqlQuery<SetChannelValuesMutation>(app.getHttpAdapter().getInstance().server, mutation, {
      variables: variables,
    });

    expect(body.data?.setChannelValues).toBe('DMX channel values set successfully');
  });
});
