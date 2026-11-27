import { expect, test } from '@playwright/test';
import { mockGraphql, mockedProject } from '../graphql-mock';
import { imagePath, shoot } from './manual-shots';

const SHOW_ID = '77777777-7777-4777-8777-777777777777';
const SHOW_CONTROL_ID = '88888888-8888-4888-8888-888888888888';
const SHOW_MS = 48_000;
const PEAKS_PER_SECOND = 20;
const BEAT_MS = 500;

const fn = (publicId: string, name: string) => ({
  __typename: 'ProjectFunctionDto',
  publicId,
  name,
  type: 'Sequence',
  sequence: null,
});

const functions = [
  fn('11111111-aaaa-4aaa-8aaa-111111111111', 'Chase'),
  fn('22222222-aaaa-4aaa-8aaa-222222222222', 'Rainbow'),
  fn('33333333-aaaa-4aaa-8aaa-333333333333', 'Strobe'),
];

// A song-like envelope: quiet intro, kicks on every beat, louder chorus in the middle.
const peaks = Array.from({ length: (SHOW_MS / 1000) * PEAKS_PER_SECOND }, (_, index) => {
  const ms = (index / PEAKS_PER_SECOND) * 1000;
  const section = ms < 8000 ? 0.3 : ms > 24_000 && ms < 40_000 ? 0.85 : 0.6;
  const kick = ms % BEAT_MS < 100 ? 0.15 : 0;
  return Math.min(1, section + kick - 0.1 * Math.sin(index / 3));
});

const clip = (id: string, functionIndex: number, startMs: number, durationMs: number, followBeat: boolean) => ({
  __typename: 'ShowLightClipDto',
  id,
  functionPublicId: functions[functionIndex]?.publicId ?? '',
  startMs,
  durationMs,
  followBeat,
});

const beatsMs = Array.from({ length: SHOW_MS / BEAT_MS - 1 }, (_, index) => 400 + index * BEAT_MS);

const demoShow = {
  __typename: 'ShowDto',
  publicId: SHOW_ID,
  name: 'Opening',
  durationMs: SHOW_MS,
  beatsMs,
  audioClips: [
    {
      __typename: 'ShowAudioClipDto',
      publicId: '99999999-9999-4999-8999-999999999999',
      fileName: 'opening-theme.mp3',
      startMs: 0,
      durationMs: SHOW_MS,
      beatsMs,
      peaks,
    },
  ],
  lightTracks: [
    {
      __typename: 'ShowLightTrackDto',
      id: 'track-front',
      name: 'Front',
      clips: [clip('clip-chase', 0, 400, 15_600, true), clip('clip-strobe', 2, 24_400, 8000, false)],
    },
    {
      __typename: 'ShowLightTrackDto',
      id: 'track-back',
      name: 'Back',
      clips: [clip('clip-rainbow', 1, 8400, 32_000, true)],
    },
  ],
  cues: [
    { __typename: 'ShowCueDto', id: 'cue-verse', name: 'Verse', ms: 8400 },
    { __typename: 'ShowCueDto', id: 'cue-chorus', name: 'Chorus', ms: 24_400 },
  ],
};

const showControl = {
  __typename: 'VirtualConsoleControlDto',
  id: SHOW_CONTROL_ID,
  type: 'show',
  x: 40,
  y: 40,
  width: 360,
  height: 104,
  label: 'Opening',
  backgroundColor: '#1a1b1e',
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
  tapTiming: null,
  fadeMaxMs: null,
  showPublicId: SHOW_ID,
  children: [],
};

const demoProject = {
  ...mockedProject,
  projectFunctions: functions,
  virtualConsole: {
    ...mockedProject.virtualConsole,
    pages: [{ ...mockedProject.virtualConsole.pages[0], controls: [showControl] }],
  },
};

const LABELS = {
  en: { followBeat: 'Follow beat', fn: 'Function', show: 'Show', cueName: 'Cue name', removeCue: 'Remove cue' },
  de: { followBeat: 'Dem Beat folgen', fn: 'Funktion', show: 'Show', cueName: 'Cue-Name', removeCue: 'Cue entfernen' },
} as const;

type Locale = keyof typeof LABELS;

for (const locale of Object.keys(LABELS) as Locale[]) {
  const labels = LABELS[locale];

  test.describe(`show manager manual (${locale})`, () => {
    test.beforeEach(async ({ page }) => {
      await mockGraphql(page);
      await page.route('**/graphql', async route => {
        const body = route.request().postDataJSON() as { operationName?: string } | null;
        if (body?.operationName === 'GetProject') {
          await route.fulfill({ json: { data: { project: demoProject } } });
        } else if (body?.operationName === 'GetShows') {
          await route.fulfill({ json: { data: { shows: [demoShow] } } });
        } else {
          await route.fallback();
        }
      });
      await page.routeWebSocket(/\/dmx$/, ws => {
        ws.send(
          JSON.stringify({
            type: 'showState',
            showPublicId: SHOW_ID,
            status: 'playing',
            positionMs: 12_500,
            durationMs: SHOW_MS,
          }),
        );
      });
    });

    test('timeline', async ({ page }) => {
      await page.goto(`/${locale}/project/${demoProject.publicId}/shows`);
      const panel = page.getByRole('tabpanel');
      await expect(panel.getByRole('button', { name: 'opening-theme.mp3' })).toBeVisible();
      await expect(panel.getByText('0:12 / 0:48')).toBeVisible();

      await shoot(page, imagePath(locale, 'show-manager-timeline.png', 'show-manager'), [panel]);
    });

    test('clip settings', async ({ page }) => {
      await page.goto(`/${locale}/project/${demoProject.publicId}/shows`);
      await page.getByRole('button', { name: 'Chase' }).click();
      const followBeat = page.getByRole('switch', { name: labels.followBeat });
      await expect(followBeat).toBeChecked();

      await shoot(page, imagePath(locale, 'show-manager-clip.png', 'show-manager'), [
        page.locator('label').filter({ hasText: new RegExp(`^${labels.fn}$`) }),
        page.getByRole('combobox', { name: labels.fn, exact: true }),
        followBeat,
      ]);
    });

    test('cue settings', async ({ page }) => {
      await page.goto(`/${locale}/project/${demoProject.publicId}/shows`);
      await page.getByRole('button', { name: 'Verse' }).click();
      const name = page.getByRole('textbox', { name: labels.cueName });
      await expect(name).toHaveValue('Verse');

      await shoot(page, imagePath(locale, 'show-manager-cue.png', 'show-manager'), [
        page.getByTestId('show-cue').filter({ hasText: 'Verse' }),
        name,
        page.getByRole('button', { name: labels.removeCue }),
      ]);
    });

    test('console control', async ({ page }) => {
      await page.goto(`/${locale}/project/${demoProject.publicId}/console/popout`);
      const control = page.getByTestId('virtual-console-show');
      await expect(control.getByText('0:12 / 0:48')).toBeVisible();

      await shoot(page, imagePath(locale, 'show-control.png'), [control]);
    });

    test('console settings', async ({ page }) => {
      await page.goto(`/${locale}/project/${demoProject.publicId}/console`);
      await page.getByTestId(`virtual-console-control-${SHOW_CONTROL_ID}`).click();
      const properties = page.getByTestId('virtual-console-split').locator(':scope > :last-child');
      const picker = properties.getByRole('combobox', { name: labels.show, exact: true });
      await expect(picker).toHaveValue('Opening');
      await picker.evaluate(element => {
        element.scrollIntoView({ block: 'center' });
      });

      await shoot(page, imagePath(locale, 'show-control-settings.png'), [
        properties.locator('label').filter({ hasText: new RegExp(`^${labels.show}$`) }),
        picker,
      ]);
    });
  });
}
