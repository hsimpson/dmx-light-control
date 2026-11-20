import { expect, test } from '@playwright/test';
import { mockGraphql, mockedProject } from '../graphql-mock';
import { imagePath, shoot } from './manual-shots';

const FADE_ID = '77777777-7777-4777-8777-777777777777';
/** Fader position that reads 1.7 s. */
const FADE_POSITION = 50;

const fadeControl = {
  __typename: 'VirtualConsoleControlDto',
  id: FADE_ID,
  type: 'globalFade',
  x: 40,
  y: 40,
  width: 64,
  height: 200,
  label: 'Fade',
  backgroundColor: '#25262b',
  borderWidth: null,
  borderColor: null,
  orientation: 'vertical',
  foregroundColor: '#fab005',
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
  tapTiming: null,
  children: [],
};

const demoProject = {
  ...mockedProject,
  virtualConsole: {
    ...mockedProject.virtualConsole,
    pages: [{ ...mockedProject.virtualConsole.pages[0], controls: [fadeControl] }],
  },
};

for (const locale of ['en', 'de'] as const) {
  test.describe(`global fade manual (${locale})`, () => {
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
        ws.send(JSON.stringify({ type: 'controlState', values: { [FADE_ID]: FADE_POSITION } }));
      });
    });

    test('control', async ({ page }) => {
      await page.goto(`/${locale}/project/${demoProject.publicId}/console/popout`);
      const slider = page.getByTestId('virtual-console-slider');
      await expect(page.getByTestId('virtual-console-slider-value')).toHaveText('1.7 s');

      await shoot(page, imagePath(locale, 'global-fade-control.png'), [slider]);
    });
  });
}
