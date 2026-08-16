import { expect, test } from '@playwright/test';
import { mockGraphql, mockedProject } from './graphql-mock';

test.describe('project list', () => {
  test.beforeEach(async ({ page }) => {
    await mockGraphql(page);
  });

  test('shows mocked projects from GraphQL', async ({ page }) => {
    await page.goto('/de/project/list');
    await expect(page.getByText(mockedProject.name)).toBeVisible();
  });

  test('exports mocked projects', async ({ page }) => {
    await page.goto('/de/project/list');
    await expect(page.getByRole('button', { name: 'Projekte exportieren' })).toBeVisible();
    await page.getByRole('button', { name: 'Projekte exportieren' }).click();
    await expect(page.getByText('Projekte exportiert')).toBeVisible();
  });

  test('creates a project from the dialog', async ({ page }) => {
    await page.goto('/de/project/list');
    await expect(page.getByText(mockedProject.name)).toBeVisible();

    await page.getByRole('button', { name: 'Projekt hinzufügen' }).click();
    await page.getByRole('dialog').getByLabel('Name').fill('Club Night');
    await page.getByRole('dialog').getByRole('button', { name: 'Projekt hinzufügen' }).click();

    await expect(page.getByRole('cell', { name: 'Club Night' })).toBeVisible();
  });

  test('renames a project from the dialog', async ({ page }) => {
    await page.goto('/de/project/list');
    await expect(page.getByText(mockedProject.name)).toBeVisible();

    await page.getByRole('button', { name: 'Projekt umbenennen' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Name').fill('Club Night');
    await dialog.getByRole('button', { name: 'Speichern' }).click();

    await expect(page.getByRole('cell', { name: 'Club Night' })).toBeVisible();
    await expect(page.getByRole('cell', { name: mockedProject.name })).toHaveCount(0);
  });

  test('deletes a project after confirm', async ({ page }) => {
    await page.goto('/de/project/list');
    await expect(page.getByText(mockedProject.name)).toBeVisible();

    await page.getByRole('button', { name: 'Projekt löschen' }).click();
    await expect(page.getByText('Projekt löschen?')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Projekt löschen' }).click();

    await expect(page.getByRole('cell', { name: mockedProject.name })).toHaveCount(0);
  });
});
