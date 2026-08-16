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

export const mockGraphql = async (page: Page) => {
  const fixtures = [mockedFixture];

  await page.route('**/graphql', async route => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204 });
      return;
    }

    const postData = route.request().postDataJSON() as {
      operationName?: string;
      query?: string;
    };

    let body: unknown = { data: {} };
    if (postData.operationName === 'GetFixtures' || postData.query?.includes('fixtures {')) {
      body = { data: { fixtures: [...fixtures] } };
    } else if (postData.operationName === 'DeleteFixture' || postData.query?.includes('deleteFixture')) {
      fixtures.splice(0, fixtures.length);
      body = { data: { deleteFixture: { publicId: mockedFixture.publicId, deleted: true } } };
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
};
