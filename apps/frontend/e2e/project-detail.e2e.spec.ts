import { expect, test } from '@playwright/test';
import { mockGraphql, mockedProject } from './graphql-mock';

test.describe('project detail', () => {
  test.beforeEach(async ({ page }) => {
    await mockGraphql(page);
  });

  test('navigates from list and adds a project fixture', async ({ page }) => {
    await page.goto('/de/project/list');
    await page.getByRole('cell', { name: mockedProject.name }).click();

    await expect(page).toHaveURL(new RegExp(`/de/project/${mockedProject.publicId}/fixtures$`));
    await expect(page.getByRole('heading', { name: mockedProject.name })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Geräte' })).toBeVisible();

    const addFixtureDialog = page.getByRole('dialog', { name: 'Gerät hinzufügen' });
    await page.getByRole('button', { name: 'Gerät hinzufügen' }).click();
    await addFixtureDialog.getByRole('combobox', { name: 'Gerät' }).click();
    await page.getByRole('option', { name: 'Acme Lights – Spot 250' }).click();
    await addFixtureDialog.getByRole('combobox', { name: 'Kanalmodus' }).click();
    await page.getByRole('option', { name: '8ch' }).click();
    await addFixtureDialog.getByLabel('Startadresse').fill('10');
    await addFixtureDialog.getByRole('button', { name: 'Speichern' }).click();

    const fixturesPanel = page.getByRole('tabpanel', { name: 'Geräte' });
    const fixtureRow = fixturesPanel.getByRole('row').filter({ hasText: 'Spot 250' });
    await expect(fixtureRow).toContainText('10');
    await expect(fixtureRow.getByRole('cell', { name: 'Spot 250' })).toBeVisible();
  });

  test('redirects bare project detail URL to the fixtures tab', async ({ page }) => {
    await page.goto(`/de/project/${mockedProject.publicId}`);

    await expect(page).toHaveURL(new RegExp(`/de/project/${mockedProject.publicId}/fixtures$`));
    await expect(page.getByRole('tab', { name: 'Geräte' })).toHaveAttribute('aria-selected', 'true');
  });

  test('preserves the active tab on reload', async ({ page }) => {
    await page.goto(`/de/project/${mockedProject.publicId}/3d`);

    await expect(page.getByRole('tab', { name: '3D-Ansicht' })).toHaveAttribute('aria-selected', 'true');

    await page.reload();

    await expect(page).toHaveURL(new RegExp(`/de/project/${mockedProject.publicId}/3d$`));
    await expect(page.getByRole('tab', { name: '3D-Ansicht' })).toHaveAttribute('aria-selected', 'true');
  });

  test('switches tabs via URL when clicking a tab', async ({ page }) => {
    await page.goto(`/de/project/${mockedProject.publicId}/fixtures`);

    await page.getByRole('tab', { name: 'Universumsansicht' }).click();

    await expect(page).toHaveURL(new RegExp(`/de/project/${mockedProject.publicId}/universe$`));
    await expect(page.getByRole('tab', { name: 'Universumsansicht' })).toHaveAttribute('aria-selected', 'true');
  });

  test('opens the virtual console tab', async ({ page }) => {
    await page.goto(`/de/project/${mockedProject.publicId}/console`);

    await expect(page.getByRole('tab', { name: 'Virtuelle Konsole' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'Page 1' })).toBeVisible();
    await expect(page.getByTestId('virtual-console-canvas')).toBeVisible();
  });
});
