import { expect, test } from '@playwright/test';
import { mockGraphql, mockedProject } from './graphql-mock';

test.describe('project input/output devices', () => {
  test.beforeEach(async ({ page }) => {
    await mockGraphql(page);
  });

  test('assigns a connected MIDI controller to the project', async ({ page }) => {
    await page.goto(`/de/project/${mockedProject.publicId}/io`);

    await expect(page.getByRole('tab', { name: 'Ein-/Ausgabe' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { name: 'DMX-Ausgänge' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'A50285BI' })).toBeVisible();

    const apc = page.getByRole('checkbox', { name: 'APC mini mk2 in diesem Projekt verwenden' });
    await expect(apc).not.toBeChecked();
    await apc.click();

    await expect(apc).toBeChecked();
    await expect(page.getByText('Verbunden')).toBeVisible();
  });
});
