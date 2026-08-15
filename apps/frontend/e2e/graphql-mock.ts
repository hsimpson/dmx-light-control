import { Page } from '@playwright/test';

const now = '2026-01-01T00:00:00.000Z';

export const mockedFixture = {
  __typename: 'FixtureDto',
  publicId: 'fix-1',
  name: 'Spot 250',
  createdAt: now,
  updatedAt: now,
  fixtureVendor: {
    __typename: 'FixtureVendorDto',
    publicId: 'vendor-1',
    name: 'Acme Lights',
    createdAt: now,
    updatedAt: now,
  },
  fixtureChannelDefinitions: [],
  fixtureChannelModes: [
    {
      __typename: 'FixtureChannelModeDto',
      publicId: 'mode-8',
      name: '8ch',
      order: 0,
      createdAt: now,
      updatedAt: now,
      fixtureChannelAssignments: [],
    },
  ],
};

const graphqlPayload = (operationName?: string, query?: string) => {
  if (operationName === 'GetFixtures' || query?.includes('fixtures {')) {
    return { data: { fixtures: [mockedFixture] } };
  }

  return { data: {} };
};

export const mockGraphql = async (page: Page) => {
  await page.route('**/graphql', async route => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204 });
      return;
    }

    const postData = route.request().postDataJSON() as {
      operationName?: string;
      query?: string;
    };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(graphqlPayload(postData.operationName, postData.query)),
    });
  });
};
