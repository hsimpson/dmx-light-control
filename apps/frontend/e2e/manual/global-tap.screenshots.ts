import { expect, test } from '@playwright/test';
import { mockGraphql, mockedProject } from '../graphql-mock';
import { imagePath, shoot } from './manual-shots';

const TAP_ID = '66666666-6666-4666-8666-666666666666';

const tapControl = {
  __typename: 'VirtualConsoleControlDto',
  id: TAP_ID,
  type: 'globalTap',
  x: 40,
  y: 40,
  width: 120,
  height: 64,
  label: 'Tap',
  backgroundColor: '#e8590c',
  borderWidth: null,
  borderColor: null,
  orientation: null,
  foregroundColor: '#ffffff',
  fontFamily: null,
  fontSize: null,
  fontWeight: null,
  valueType: null,
  lowerLimit: null,
  upperLimit: null,
  channelBindings: null,
  buttonMode: null,
  functionPublicId: null,
  functionName: null,
  midiEntryPublicId: null,
  feedback: null,
  bandCount: null,
  audioBars: null,
  beatBar: null,
  tapTiming: { __typename: 'VirtualConsoleBeatTimingDto', fadeIn: 0, hold: 40, fadeOut: 60 },
  children: [],
};

const demoProject = {
  ...mockedProject,
  virtualConsole: {
    ...mockedProject.virtualConsole,
    pages: [{ ...mockedProject.virtualConsole.pages[0], controls: [tapControl] }],
  },
};

const LABELS = {
  en: { timing: 'Timing', fadeOut: 'Fade out (%)' },
  de: { timing: 'Timing', fadeOut: 'Ausblenden (%)' },
} as const;

type Locale = keyof typeof LABELS;

for (const locale of Object.keys(LABELS) as Locale[]) {
  const labels = LABELS[locale];

  test.describe(`global tap manual (${locale})`, () => {
    test.beforeEach(async ({ page }) => {
      await mockGraphql(page);
      await page.route('**/graphql', async route => {
        const body = route.request().postDataJSON() as { operationName?: string } | null;
        if (body?.operationName !== 'GetProject') {
          await route.fallback();
          return;
        }
        await route.fulfill({ json: { data: { project: demoProject } } });
      });
      await page.routeWebSocket(/\/dmx$/, ws => {
        ws.send(JSON.stringify({ type: 'controlState', values: { [TAP_ID]: 255 } }));
      });
    });

    test('control pressed', async ({ page }) => {
      await page.goto(`/${locale}/project/${demoProject.publicId}/console/popout`);
      const button = page.getByTestId('virtual-console-button');
      await expect(button).toHaveAttribute('data-pressed', 'true');

      await shoot(page, imagePath(locale, 'global-tap-pressed.png'), [button]);
    });

    test('settings', async ({ page }) => {
      await page.goto(`/${locale}/project/${demoProject.publicId}/console`);
      await page.getByTestId(`virtual-console-control-${TAP_ID}`).click();
      const properties = page.getByTestId('virtual-console-split').locator(':scope > :last-child');
      const timing = properties.getByRole('combobox', { name: labels.timing, exact: true });
      const fadeOut = properties.getByRole('textbox', { name: labels.fadeOut, exact: true });
      await timing.evaluate(element => {
        element.scrollIntoView({ block: 'center' });
      });

      await shoot(page, imagePath(locale, 'global-tap-settings.png'), [
        properties.getByText(labels.timing, { exact: true }),
        timing,
        fadeOut,
      ]);
    });
  });
}
