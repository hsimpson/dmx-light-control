import { expect, type Page, test } from '@playwright/test';
import { mockGraphql, mockedProject } from '../graphql-mock';
import { imagePath, shoot } from './manual-shots';

const AUDIO_ID = '33333333-3333-4333-8333-333333333333';
const FUNCTION_ID = '44444444-4444-4444-8444-444444444444';
const PAR_ID = '55555555-5555-4555-8555-555555555555';
const now = '2026-01-01T00:00:00.000Z';

const channel = (publicId: string, channelNumber: number, name: string, preset: string) => ({
  __typename: 'FixtureChannelAssignmentDto',
  publicId,
  channelNumber,
  fixtureChannelDefinition: { __typename: 'FixtureChannelDefinitionDto', name, preset, fixtureChannelRanges: [] },
});

const par = {
  __typename: 'ProjectFixtureDto',
  publicId: PAR_ID,
  startAddress: 1,
  transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  createdAt: now,
  updatedAt: now,
  fixture: {
    __typename: 'ProjectFixtureFixtureDto',
    publicId: 'fixture-par',
    name: 'LED Par',
    model3dPath: null,
    beamAngle: 25,
    fixtureVendor: { __typename: 'FixtureVendorDto', publicId: 'vendor-generic', name: 'Generic' },
  },
  channelMode: {
    __typename: 'ProjectFixtureChannelModeDto',
    publicId: 'mode-4',
    name: '4ch',
    fixtureChannelAssignments: [
      channel('par-dimmer', 1, 'Dimmer', 'IntensityDimmer'),
      channel('par-red', 2, 'Red', 'IntensityRed'),
      channel('par-green', 3, 'Green', 'IntensityGreen'),
      channel('par-blue', 4, 'Blue', 'IntensityBlue'),
    ],
  },
};

const bar = (overrides: Record<string, unknown> = {}) => ({
  __typename: 'VirtualConsoleAudioBarDto',
  mode: 'none',
  minThreshold: 20,
  maxThreshold: 80,
  channelBindings: null,
  functionPublicId: null,
  functionName: null,
  ...overrides,
});

const audioControl = {
  __typename: 'VirtualConsoleControlDto',
  id: AUDIO_ID,
  type: 'audioTriggers',
  x: 40,
  y: 40,
  width: 360,
  height: 200,
  label: 'Sound2Light',
  backgroundColor: '#1f2937',
  borderWidth: null,
  borderColor: null,
  orientation: null,
  foregroundColor: '#38bdf8',
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
  bandCount: 8,
  audioBars: [
    bar(),
    bar({
      mode: 'channels',
      minThreshold: 30,
      maxThreshold: 75,
      channelBindings: [
        {
          __typename: 'VirtualConsoleChannelBindingDto',
          projectFixturePublicId: PAR_ID,
          channelAssignmentPublicId: 'par-dimmer',
          channelNumber: null,
          channelDefinitionPublicId: null,
        },
      ],
    }),
    ...Array.from({ length: 7 }, () => bar()),
  ],
  tapTiming: null,
  beatBar: {
    __typename: 'VirtualConsoleBeatBarDto',
    minThreshold: 20,
    functionPublicId: FUNCTION_ID,
    functionName: null,
    timing: { __typename: 'VirtualConsoleBeatTimingDto', fadeIn: 0, hold: 40, fadeOut: 60 },
  },
  children: [],
};

const demoProject = {
  ...mockedProject,
  virtualConsole: {
    ...mockedProject.virtualConsole,
    pages: [{ ...mockedProject.virtualConsole.pages[0], controls: [audioControl] }],
  },
  projectFixtures: [par],
  project3dObjects: [],
  projectFunctions: [
    {
      __typename: 'ProjectFunctionDto',
      publicId: FUNCTION_ID,
      name: 'Sound2Light (T-Bars)',
      type: 'Sequence',
      sequence: {
        __typename: 'SequencePropertiesDto',
        direction: 'Forward',
        runOrder: 'Loop',
        fixturePublicIds: [PAR_ID],
        steps: [],
      },
    },
  ],
};

/** Volume, 8 bands, then the beat pulse: a plausible frame of a song with a strong kick. */
const LEVELS = [0.72, 0.86, 0.79, 0.58, 0.5, 0.44, 0.37, 0.29, 0.21, 0.9];

const LABELS = {
  en: {
    bar: 'Bar',
    bands: 'Bands',
    fadeOut: 'Fade out (%)',
    maxThreshold: 'Max threshold (%)',
    channels: 'Channels',
    clearAssignments: 'Clear assignments',
  },
  de: {
    bar: 'Balken',
    bands: 'Bänder',
    fadeOut: 'Ausblenden (%)',
    maxThreshold: 'Max. Schwelle (%)',
    channels: 'Kanäle',
    clearAssignments: 'Zuweisungen löschen',
  },
} as const;

type Locale = keyof typeof LABELS;

const stage = async (page: Page) => {
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
    const send = () => {
      ws.send(JSON.stringify({ type: 'controlState', values: { [AUDIO_ID]: 255 } }));
      ws.send(JSON.stringify({ type: 'audioLevels', levels: { [AUDIO_ID]: LEVELS }, bpm: { [AUDIO_ID]: 120 } }));
    };
    send();
    // The client hides a tempo that has not been refreshed for 2.5 s.
    const timer = setInterval(send, 1000);
    ws.onClose(() => {
      clearInterval(timer);
    });
  });
};

for (const locale of Object.keys(LABELS) as Locale[]) {
  const labels = LABELS[locale];

  test.describe(`audio trigger manual (${locale})`, () => {
    test.beforeEach(async ({ page }) => {
      await stage(page);
    });

    test('control playing', async ({ page }) => {
      await page.goto(`/${locale}/project/${demoProject.publicId}/console/popout`);
      const control = page.getByTestId('virtual-console-audio-triggers');
      await expect(control.getByTestId('virtual-console-audio-bpm')).toContainText('120 BPM');

      await shoot(page, imagePath(locale, 'audio-trigger-playing.png'), [control]);
    });

    test('settings', async ({ page }) => {
      await page.goto(`/${locale}/project/${demoProject.publicId}/console`);
      await page.getByTestId(`virtual-console-control-${AUDIO_ID}`).click();
      const properties = page.getByTestId('virtual-console-split').locator(':scope > :last-child');
      const field = (label: string) => properties.getByRole('textbox', { name: label, exact: true });
      const bandsLabel = properties.getByText(labels.bands, { exact: true });
      const barSelect = properties.getByRole('combobox', { name: labels.bar, exact: true });
      // Puts the audio fields at the top of the scrolling panel, level with the channel panel's content.
      const showAudioFields = async () => {
        await bandsLabel.evaluate(element => {
          element.scrollIntoView({ block: 'start' });
        });
      };

      await showAudioFields();
      await barSelect.click();
      const list = page.getByRole('listbox');
      const beatOption = list.getByRole('option', { name: 'Beat' });
      // The list scrolls; its end shows the last bands and Beat.
      await beatOption.scrollIntoViewIfNeeded();
      await shoot(page, imagePath(locale, 'audio-trigger-band-list.png'), [
        properties.getByText(labels.bar, { exact: true }),
        list,
      ]);

      await beatOption.click();
      const sidebar = page.getByTestId('virtual-console-channel-sidebar');
      await expect(sidebar.getByRole('combobox')).toHaveValue('Sound2Light (T-Bars)');
      await showAudioFields();
      await shoot(page, imagePath(locale, 'audio-trigger-beat-settings.png'), [
        sidebar.getByRole('combobox'),
        bandsLabel,
        field(labels.fadeOut),
      ]);

      await barSelect.click();
      await page
        .getByRole('listbox')
        .getByRole('option', { name: /^Band 1 / })
        .click();
      const fixture = sidebar.getByText('LED Par [1]');
      await fixture.click();
      await expect(sidebar.getByRole('checkbox').first()).toBeChecked();
      await showAudioFields();
      await shoot(page, imagePath(locale, 'audio-trigger-level-settings.png'), [
        sidebar.getByText(labels.channels, { exact: true }),
        sidebar.getByRole('button', { name: labels.clearAssignments }),
        sidebar.getByRole('checkbox').last(),
        bandsLabel,
        field(labels.maxThreshold),
      ]);
    });
  });
}
