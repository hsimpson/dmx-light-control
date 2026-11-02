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

  test('exports and imports the mapping catalog', async ({ page }) => {
    await page.goto('/de/midiMapping/list');

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'MIDI-Mappings exportieren' }).click();
    expect((await download).suggestedFilename()).toBe('midi-mappings.json');

    await page.locator('input[type="file"]').setInputFiles({
      name: 'midi-mappings.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"schemaVersion":1,"mappings":[]}'),
    });
    await expect(page.getByText('MIDI-Mappings importiert')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Imported APC' })).toBeVisible();
  });

  test('saves named LED options and picks them for a control', async ({ page }) => {
    await page.goto(`/de/midiMapping/${mockedMidiMapping.publicId}`);
    const behaviors = 'Verhalten (Kanal 0-15)';
    const colors = 'Farben (Velocity 0-127)';
    await page.getByRole('button', { name: `${behaviors}: Hinzufügen` }).click();
    await page.getByRole('textbox', { name: `${behaviors} 1: Name` }).fill('Solid 100 %');
    await page.getByRole('textbox', { name: `${behaviors} 1: Wert` }).fill('6');
    await page.getByRole('button', { name: `${colors}: Hinzufügen` }).click();
    await page.getByRole('textbox', { name: `${colors} 1: Name` }).fill('Red');
    await page.getByRole('textbox', { name: `${colors} 1: Wert` }).fill('5');
    await page.getByRole('textbox', { name: `${colors} 1: Farbfeld` }).fill('#FF0000');
    await page.getByRole('button', { name: 'LED-Farben speichern' }).click();
    await expect(page.getByText('LED-Farben und -Verhalten gespeichert')).toBeVisible();

    await page.getByRole('button', { name: 'Bedienelement hinzufügen' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Name').fill('Pad 1');
    await dialog.getByLabel('LED-Feedback').check();
    await dialog.getByRole('combobox', { name: 'An: Verhalten (Kanal 0-15)' }).click();
    await page.getByRole('option', { name: 'Solid 100 %', exact: true }).click();
    await dialog.getByRole('combobox', { name: 'An: Farbe (Velocity 0-127)' }).click();
    await page.getByRole('option', { name: 'Red', exact: true }).click();
    await dialog.getByRole('button', { name: 'Speichern' }).click();

    await expect(page.getByRole('cell', { name: '0/0 → 6/5' })).toBeVisible();
  });
});
