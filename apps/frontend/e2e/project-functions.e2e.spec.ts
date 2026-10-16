import { expect, test } from '@playwright/test';
import { mockGraphql, mockedProject } from './graphql-mock';

test.describe('project functions', () => {
  test.beforeEach(async ({ page }) => {
    await mockGraphql(page);
  });

  test('creates a sequence in the full-page editor', async ({ page }) => {
    await page.goto(`/de/project/${mockedProject.publicId}/functions`);
    await page.getByRole('button', { name: 'Funktion hinzufügen' }).click();
    await expect(page).toHaveURL(new RegExp(`/de/project/${mockedProject.publicId}/functions/new$`));

    await page.getByRole('textbox', { name: 'Name' }).fill('Chase');
    await page.getByRole('gridcell', { name: 'Einblenden (ms), Schritt 1' }).click();
    await page.keyboard.type('500', { delay: 20 });
    await page.keyboard.press('Enter');
    await expect(page.getByRole('gridcell', { name: 'Einblenden (ms), Schritt 1' })).toHaveText('500');

    await page.getByRole('button', { name: 'Schritt hinzufügen' }).click();
    await expect(page.getByRole('columnheader', { name: /Schritt 2/ })).toBeVisible();

    await page.getByRole('button', { name: 'Speichern' }).click();
    await expect(page).toHaveURL(new RegExp(`/de/project/${mockedProject.publicId}/functions/fn-1$`));

    await page.getByRole('button', { name: 'Zurück' }).click();
    await expect(page).toHaveURL(new RegExp(`/de/project/${mockedProject.publicId}/functions$`));
    await expect(page.getByRole('cell', { name: 'Chase' })).toBeVisible();
  });
});
