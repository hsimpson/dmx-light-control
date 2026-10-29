import { expect, test } from '@playwright/test';
import { mockGraphql, mockedMidiMapping } from './graphql-mock';

test.describe('MIDI mappings', () => {
  test.beforeEach(async ({ page }) => {
    await mockGraphql(page);
  });

  test('lists mappings from the menu and opens the detail', async ({ page }) => {
    await page.goto('/de');
    await page.getByRole('link', { name: 'MIDI-Mappings' }).click();

    await expect(page.getByRole('heading', { name: 'MIDI-Mappings' })).toBeVisible();
    await page.getByRole('cell', { name: mockedMidiMapping.name }).click();

    await expect(page).toHaveURL(new RegExp(`/midiMapping/${mockedMidiMapping.publicId}$`));
    await expect(page.getByText('Noch keine Bedienelemente')).toBeVisible();
  });

  test('adds a button with LED feedback', async ({ page }) => {
    await page.goto(`/de/midiMapping/${mockedMidiMapping.publicId}`);

    await page.getByRole('button', { name: 'Bedienelement hinzufügen' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Name').fill('Track Button 1');
    await dialog.getByLabel('Note / Controller (0-127)').fill('100');
    await dialog.getByLabel('LED-Feedback').check();
    await dialog.getByLabel('An: Farbe (Velocity 0-127)').fill('1');
    await dialog.getByRole('button', { name: 'Speichern' }).click();

    await expect(page.getByRole('cell', { name: 'Track Button 1' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Note 0 / 100' })).toBeVisible();
    await expect(page.getByRole('cell', { name: '0/0 → 0/1' })).toBeVisible();
  });

  test('creates a mapping and navigates to it', async ({ page }) => {
    await page.goto('/de/midiMapping/list');

    await page.getByRole('button', { name: 'MIDI-Mapping hinzufügen' }).click();
    await page.getByRole('dialog').getByLabel('Name').fill('Launchpad');
    await page.getByRole('dialog').getByRole('button', { name: 'MIDI-Mapping hinzufügen' }).click();

    await expect(page.getByRole('heading', { name: 'Launchpad' })).toBeVisible();
  });
});
