import { expect, test } from '@playwright/test';
import { mockGraphql } from './graphql-mock';

test.describe('home', () => {
  test.beforeEach(async ({ page }) => {
    await mockGraphql(page);
  });

  test('shows import and export actions with labels', async ({ page }) => {
    await page.goto('/de');
    await expect(page.getByRole('button', { name: 'Fixtures importieren' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Fixtures exportieren' })).toBeVisible();
  });
});
