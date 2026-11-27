import { expect, test } from '@playwright/test';
import { mockGraphql, mockedProject } from './graphql-mock';

test.describe('show manager', () => {
  test.beforeEach(async ({ page }) => {
    await mockGraphql(page);
  });

  test('creates a show and saves a new light track', async ({ page }) => {
    await page.goto(`/de/project/${mockedProject.publicId}/shows`);
    await expect(page.getByText('Dieses Projekt hat noch keine Shows.')).toBeVisible();

    await page.getByRole('button', { name: 'Neue Show' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill('Opener');
    await page.getByRole('button', { name: 'Speichern', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Show' })).toHaveValue('Opener');

    await page.getByRole('button', { name: 'Lichtspur hinzufügen' }).click();
    await expect(page.getByRole('button', { name: 'Spur 1' })).toBeVisible();
    await page.getByRole('button', { name: 'Speichern', exact: true }).click();

    await expect(page.getByRole('button', { name: 'Speichern', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Spur 1' })).toBeVisible();
  });
});
