import { expect, test } from '@playwright/test';
import { mockGraphql } from './graphql-mock';

test.describe('home', () => {
  test.beforeEach(async ({ page }) => {
    await mockGraphql(page);
  });

  test('shows the home title', async ({ page }) => {
    await page.goto('/de');
    await expect(page.getByRole('heading', { name: 'Startseite' })).toBeVisible();
  });
});
