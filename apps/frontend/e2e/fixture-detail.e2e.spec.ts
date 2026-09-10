import { expect, test } from '@playwright/test';
import { mockGraphql, mockedFixture } from './graphql-mock';

test.describe('fixture detail', () => {
  test.beforeEach(async ({ page }) => {
    await mockGraphql(page);
  });

  test('navigates from list to the general tab', async ({ page }) => {
    await page.goto('/de/fixture/list');
    await page.getByRole('cell', { name: mockedFixture.name }).click();

    await expect(page).toHaveURL(new RegExp(`/de/fixture/${mockedFixture.publicId}/general$`));
    await expect(
      page.getByRole('heading', { name: `${mockedFixture.fixtureVendor.name} / ${mockedFixture.name}` }),
    ).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Allgemein' })).toHaveAttribute('aria-selected', 'true');
  });

  test('redirects bare fixture detail URL to the general tab', async ({ page }) => {
    await page.goto(`/de/fixture/${mockedFixture.publicId}`);

    await expect(page).toHaveURL(new RegExp(`/de/fixture/${mockedFixture.publicId}/general$`));
    await expect(page.getByRole('tab', { name: 'Allgemein' })).toHaveAttribute('aria-selected', 'true');
  });

  test('preserves the active tab on reload', async ({ page }) => {
    await page.goto(`/de/fixture/${mockedFixture.publicId}/channels`);

    await expect(page.getByRole('tab', { name: 'Kanäle' })).toHaveAttribute('aria-selected', 'true');

    await page.reload();

    await expect(page).toHaveURL(new RegExp(`/de/fixture/${mockedFixture.publicId}/channels$`));
    await expect(page.getByRole('tab', { name: 'Kanäle' })).toHaveAttribute('aria-selected', 'true');
  });

  test('switches tabs via URL when clicking a tab', async ({ page }) => {
    await page.goto(`/de/fixture/${mockedFixture.publicId}/general`);

    await page.getByRole('tab', { name: 'Kanalmodi' }).click();

    await expect(page).toHaveURL(new RegExp(`/de/fixture/${mockedFixture.publicId}/channel-modes$`));
    await expect(page.getByRole('tab', { name: 'Kanalmodi' })).toHaveAttribute('aria-selected', 'true');
  });

  test('shows dimensions on the properties tab', async ({ page }) => {
    await page.goto(`/de/fixture/${mockedFixture.publicId}/properties`);

    await expect(page.getByRole('tab', { name: 'Eigenschaften' })).toHaveAttribute('aria-selected', 'true');
    await expect(
      page.getByRole('heading', { name: `${mockedFixture.fixtureVendor.name} / ${mockedFixture.name}` }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Abmessungen' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Assets' })).toBeVisible();
  });

  test('shows the general tab when adding a fixture', async ({ page }) => {
    await page.goto('/de/fixture/new');

    await expect(page).toHaveURL(/\/de\/fixture\/new\/general$/);
    await expect(page.getByRole('heading', { name: 'Fixture hinzufügen' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Allgemein' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'Eigenschaften' })).toBeVisible();
  });
});
