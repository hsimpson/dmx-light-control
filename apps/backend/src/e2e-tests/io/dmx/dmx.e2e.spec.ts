import { createE2eApp } from '@/testhelpers/e2e-app';
import { graphqlQuery } from '@/testhelpers/graphql-test-client';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import gql from 'graphql-tag';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

type SetChannelValuesMutation = {
  setChannelValues: string;
};

describe('DMX E2E Tests', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createE2eApp();
  });

  afterAll(async () => {
    await app.close();
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
