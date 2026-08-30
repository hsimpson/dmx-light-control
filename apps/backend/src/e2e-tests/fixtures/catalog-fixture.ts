import { FixtureChannelPreset } from '@/fixtures/channel-presets';
import { graphqlQuery } from '@/testhelpers/graphql-test-client';
import gql from 'graphql-tag';
import type { App } from 'supertest/types';

export type CatalogFixture = {
  fixturePublicId: string;
  vendorPublicId: string;
  redDefinitionPublicId: string;
  greenDefinitionPublicId: string;
  redRangePublicId: string;
  fourChannelModePublicId: string;
  fiveChannelModePublicId: string;
};

const CREATE_FIXTURE = gql`
  mutation ($input: CreateFixtureInput!) {
    createFixture(input: $input) {
      publicId
      fixtureVendor {
        publicId
      }
    }
  }
`;

const UPDATE_FIXTURE = gql`
  mutation ($input: UpdateFixtureInput!) {
    updateFixture(input: $input) {
      publicId
      fixtureChannelDefinitions {
        publicId
        name
        fixtureChannelRanges {
          publicId
        }
      }
      fixtureChannelModes {
        publicId
        name
      }
    }
  }
`;

const GET_FIXTURE = gql`
  query ($publicId: UUID!) {
    fixture(publicId: $publicId) {
      fixtureChannelDefinitions {
        publicId
        name
      }
    }
  }
`;

export async function createEuroliteVendor(server: App): Promise<void> {
  const existing = await graphqlQuery<{ fixtureVendors: { name: string }[] }>(
    server,
    gql`
      query {
        fixtureVendors {
          name
        }
      }
    `,
  );
  if (existing.data?.fixtureVendors.some(vendor => vendor.name === 'eurolite')) {
    return;
  }

  const body = await graphqlQuery<{ createFixtureVendor: { publicId: string } }>(
    server,
    gql`
      mutation ($input: CreateFixtureVendorInput!) {
        createFixtureVendor(input: $input) {
          publicId
        }
      }
    `,
    { variables: { input: { name: 'eurolite' } } },
  );
  if (body.errors?.length) {
    const vendors = await graphqlQuery<{ fixtureVendors: { name: string }[] }>(
      server,
      gql`
        query {
          fixtureVendors {
            name
          }
        }
      `,
    );
    if (vendors.data?.fixtureVendors.some(vendor => vendor.name === 'eurolite')) {
      return;
    }
    throw new Error(body.errors[0]?.message ?? 'Failed to create eurolite vendor');
  }
}

export async function setupCatalogFixture(
  server: App,
  options: { fixtureName?: string } = {},
): Promise<CatalogFixture> {
  const fixtureName = options.fixtureName ?? 'E2E Catalog Par';

  const created = await graphqlQuery<{
    createFixture: { publicId: string; fixtureVendor: { publicId: string } };
  }>(server, CREATE_FIXTURE, {
    variables: {
      input: {
        name: fixtureName,
        vendor: { name: 'American DJ' },
      },
    },
  });
  if (created.errors?.length || !created.data?.createFixture.publicId) {
    throw new Error(created.errors?.[0]?.message ?? 'Failed to create catalog fixture');
  }

  const fixturePublicId = created.data.createFixture.publicId;
  const vendorPublicId = created.data.createFixture.fixtureVendor.publicId;

  const withDefinitions = await graphqlQuery<{
    updateFixture: {
      fixtureChannelDefinitions: {
        publicId: string;
        name: string;
        fixtureChannelRanges: { publicId: string }[];
      }[];
    };
  }>(server, UPDATE_FIXTURE, {
    variables: {
      input: {
        publicId: fixturePublicId,
        channelDefinitions: [
          {
            name: 'Red',
            order: 0,
            preset: FixtureChannelPreset.IntensityRed,
            ranges: [{ dmxStart: 0, dmxEnd: 255, description: 'Red, 0% to 100%' }],
          },
          {
            name: 'Green',
            order: 1,
            preset: FixtureChannelPreset.IntensityGreen,
            ranges: [{ dmxStart: 0, dmxEnd: 255, description: 'Green, 0% to 100%' }],
          },
        ],
      },
    },
  });
  if (withDefinitions.errors?.length) {
    throw new Error(withDefinitions.errors[0]?.message ?? 'Failed to create catalog definitions');
  }

  const definitions = withDefinitions.data?.updateFixture.fixtureChannelDefinitions ?? [];
  const redDefinition = definitions.find(definition => definition.name === 'Red');
  const greenDefinition = definitions.find(definition => definition.name === 'Green');
  const redRangePublicId = redDefinition?.fixtureChannelRanges[0]?.publicId;
  if (!redDefinition?.publicId || !greenDefinition?.publicId || !redRangePublicId) {
    throw new Error('Catalog fixture is missing Red/Green definitions');
  }

  const loaded = await graphqlQuery<{
    fixture: { fixtureChannelDefinitions: { publicId: string; name: string }[] } | null;
  }>(server, GET_FIXTURE, { variables: { publicId: fixturePublicId } });
  const loadedDefinitions = loaded.data?.fixture?.fixtureChannelDefinitions ?? [];
  const redDefinitionPublicId =
    loadedDefinitions.find(definition => definition.name === 'Red')?.publicId ?? redDefinition.publicId;
  const greenDefinitionPublicId =
    loadedDefinitions.find(definition => definition.name === 'Green')?.publicId ?? greenDefinition.publicId;

  const withModes = await graphqlQuery<{
    updateFixture: { fixtureChannelModes: { publicId: string; name: string }[] };
  }>(server, UPDATE_FIXTURE, {
    variables: {
      input: {
        publicId: fixturePublicId,
        channelModes: [
          {
            name: '4ch',
            assignments: [
              { channelDefinitionPublicId: redDefinitionPublicId },
              { channelDefinitionPublicId: greenDefinitionPublicId },
              { channelDefinitionPublicId: redDefinitionPublicId },
              { channelDefinitionPublicId: greenDefinitionPublicId },
            ],
          },
          {
            name: '5ch',
            assignments: [
              { channelDefinitionPublicId: redDefinitionPublicId },
              { channelDefinitionPublicId: greenDefinitionPublicId },
              { channelDefinitionPublicId: redDefinitionPublicId },
              { channelDefinitionPublicId: greenDefinitionPublicId },
              { channelDefinitionPublicId: redDefinitionPublicId },
            ],
          },
        ],
      },
    },
  });
  if (withModes.errors?.length) {
    throw new Error(withModes.errors[0]?.message ?? 'Failed to create catalog modes');
  }

  const fourChannelModePublicId = withModes.data?.updateFixture.fixtureChannelModes.find(
    mode => mode.name === '4ch',
  )?.publicId;
  const fiveChannelModePublicId = withModes.data?.updateFixture.fixtureChannelModes.find(
    mode => mode.name === '5ch',
  )?.publicId;
  if (!fourChannelModePublicId || !fiveChannelModePublicId) {
    throw new Error('Catalog fixture is missing channel modes');
  }

  return {
    fixturePublicId,
    vendorPublicId,
    redDefinitionPublicId,
    greenDefinitionPublicId,
    redRangePublicId,
    fourChannelModePublicId,
    fiveChannelModePublicId,
  };
}
