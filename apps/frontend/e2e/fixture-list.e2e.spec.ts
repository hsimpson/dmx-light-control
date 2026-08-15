import { expect, test } from '@playwright/test';
import { mockGraphql, mockedFixture } from './graphql-mock';

test.describe('fixture list', () => {
  test.beforeEach(async ({ page }) => {
    await mockGraphql(page);
  });

  test('shows mocked fixtures from GraphQL', async ({ page }) => {
    await page.goto('/de/fixture/list');
    await expect(page.getByText(mockedFixture.name)).toBeVisible();
    await expect(page.getByText(mockedFixture.fixtureVendor.name)).toBeVisible();
  });
});
