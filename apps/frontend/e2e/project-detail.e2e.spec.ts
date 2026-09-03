import { expect, test } from '@playwright/test';
import { mockGraphql, mockedProject } from './graphql-mock';

test.describe('project detail', () => {
  test.beforeEach(async ({ page }) => {
    await mockGraphql(page);
  });

  test('navigates from list and adds a project fixture', async ({ page }) => {
    await page.goto('/de/project/list');
    await page.getByRole('cell', { name: mockedProject.name }).click();

    await expect(page.getByRole('heading', { name: mockedProject.name })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Geräte' })).toBeVisible();

    await page.getByRole('button', { name: 'Gerät hinzufügen' }).click();
    await page.getByLabel('Gerät').click();
    await page.getByRole('option', { name: 'Acme Lights – Spot 250' }).click();
    await page.getByLabel('Kanalmodus').click();
    await page.getByRole('option', { name: '8ch' }).click();
    await page.getByLabel('Startadresse').fill('10');
    await page.getByRole('dialog').getByRole('button', { name: 'Speichern' }).click();

    await expect(page.getByRole('cell', { name: '10' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Spot 250' })).toBeVisible();
  });
});
