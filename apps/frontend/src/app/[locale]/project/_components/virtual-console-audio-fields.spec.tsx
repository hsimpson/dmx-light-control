import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VirtualConsoleAudioFields from './virtual-console-audio-fields';
import { createControl, patchAudioBar, type VirtualConsoleControl } from './virtual-console-document';

const audioControl = () => createControl('audioTriggers', 0, 0);
const patchMock = () => vi.fn<(patch: Partial<VirtualConsoleControl>) => void>();

describe('VirtualConsoleAudioFields', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('GIVEN configured bars WHEN 12 is typed as band count THEN they are kept and resized only on commit', async () => {
    const onPatch = patchMock();
    const control = audioControl();
    const configured = {
      ...control,
      audioBars: patchAudioBar(control.audioBars ?? [], 5, { mode: 'function', functionPublicId: 'fn-1' }),
    };
    const { user } = renderWithProviders(
      <VirtualConsoleAudioFields control={configured} barIndex={0} onBarIndexChange={vi.fn()} onPatch={onPatch} />,
    );

    const bands = screen.getByRole('textbox', { name: 'Bands' });
    await user.clear(bands);
    await user.type(bands, '12{Enter}');

    expect(onPatch).toHaveBeenCalledTimes(1);
    const patch = onPatch.mock.lastCall?.[0];
    expect(patch?.bandCount).toBe(12);
    expect(patch?.audioBars).toHaveLength(13);
    expect(patch?.audioBars?.[5]).toMatchObject({ mode: 'function', functionPublicId: 'fn-1' });
  });

  it('GIVEN the selected bar WHEN its mode changes and 90 is typed as max THEN only that bar is patched', async () => {
    const onPatch = patchMock();
    const { user } = renderWithProviders(
      <VirtualConsoleAudioFields control={audioControl()} barIndex={2} onBarIndexChange={vi.fn()} onPatch={onPatch} />,
    );

    await user.click(screen.getByRole('combobox', { name: 'Drives' }));
    await user.click(await screen.findByRole('option', { name: 'Channels', hidden: true }));
    const max = screen.getByRole('textbox', { name: 'Max threshold (%)' });
    await user.clear(max);
    await user.type(max, '90');
    await user.tab();

    const [modeBars, thresholdBars] = onPatch.mock.calls.map(([patch]) => patch.audioBars);
    expect(modeBars?.[2]?.mode).toBe('channels');
    expect(modeBars?.[1]?.mode).toBe('none');
    expect(thresholdBars?.[2]?.maxThreshold).toBe(90);
  });

  it('GIVEN a min threshold WHEN a value above the max is typed THEN it is clamped below the max', async () => {
    const onPatch = patchMock();
    const { user } = renderWithProviders(
      <VirtualConsoleAudioFields control={audioControl()} barIndex={1} onBarIndexChange={vi.fn()} onPatch={onPatch} />,
    );

    const min = screen.getByRole('textbox', { name: 'Min threshold (%)' });
    await user.clear(min);
    await user.type(min, '95{Enter}');

    expect(onPatch.mock.lastCall?.[0]?.audioBars?.[1]?.minThreshold).toBe(79);
  });

  it('GIVEN several bars WHEN another bar is picked THEN the selection callback gets its index', async () => {
    const onBarIndexChange = vi.fn<(index: number) => void>();
    const { user } = renderWithProviders(
      <VirtualConsoleAudioFields
        control={audioControl()}
        barIndex={0}
        onBarIndexChange={onBarIndexChange}
        onPatch={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('combobox', { name: 'Bar' }));
    await user.click(await screen.findByRole('option', { name: 'Band 3 (179 Hz – 378 Hz)', hidden: true }));

    expect(onBarIndexChange).toHaveBeenCalledWith(3);
  });

  it('GIVEN 8 bands WHEN the bar list opens THEN each band names the frequency range the analyser uses', async () => {
    const { user } = renderWithProviders(
      <VirtualConsoleAudioFields control={audioControl()} barIndex={0} onBarIndexChange={vi.fn()} onPatch={vi.fn()} />,
    );

    await user.click(screen.getByRole('combobox', { name: 'Bar' }));

    const options = await screen.findAllByRole('option', { hidden: true });
    const labels = options.map(option => option.textContent).filter(label => label.startsWith('Band'));
    expect(labels).toEqual([
      'Band 1 (40 Hz – 85 Hz)',
      'Band 2 (85 Hz – 179 Hz)',
      'Band 3 (179 Hz – 378 Hz)',
      'Band 4 (378 Hz – 800 Hz)',
      'Band 5 (800 Hz – 1.7 kHz)',
      'Band 6 (1.7 kHz – 3.6 kHz)',
      'Band 7 (3.6 kHz – 7.6 kHz)',
      'Band 8 (7.6 kHz – 16 kHz)',
    ]);
  });
});
