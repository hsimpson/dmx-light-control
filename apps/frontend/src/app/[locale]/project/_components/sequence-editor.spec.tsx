import { dmxStore, resetDmxStore } from '@/lib/dmx/dmx-store';
import { FixtureChannelPreset } from '@/shared/types/graphql/graphql';
import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { act, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectFunctionDraft } from './project-function-mapping';
import SequenceEditor from './sequence-editor';
import type { SequenceFixtureChannel } from './sequence-steps';

const fixtures: SequenceFixtureChannel[] = [
  {
    publicId: 'par',
    startAddress: 1,
    name: 'PAR',
    channels: [{ channelNumber: 1, name: 'Dimmer', preset: FixtureChannelPreset.IntensityDimmer }],
  },
  {
    publicId: 'wash',
    startAddress: 5,
    name: 'Wash',
    channels: [{ channelNumber: 1, name: 'Intensity', preset: FixtureChannelPreset.IntensityRed }],
  },
];

const openFixtures = async (user: { click: (element: HTMLElement) => Promise<void> }) => {
  await user.click(screen.getByRole('button', { name: /Fixtures/ }));
};

const expandGroup = async (user: { click: (element: HTMLElement) => Promise<void> }, name: string) => {
  await user.click(screen.getByRole('button', { name: `Toggle ${name}` }));
};

const initial = (): ProjectFunctionDraft => ({
  name: 'Chase',
  direction: 'forward',
  runOrder: 'loop',
  steps: [{ key: 's1', fadeIn: 0, hold: 0, fadeOut: 0, dmxValues: [] }],
  fixturePublicIds: ['par'],
});

describe('SequenceEditor', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = () => undefined;
    resetDmxStore();
  });

  it('saves the edited draft', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const { user } = renderWithProviders(
      <SequenceEditor fixtures={fixtures} initial={initial()} saving={false} onSave={onSave} onLeave={vi.fn()} />,
    );
    await user.clear(screen.getByRole('textbox', { name: 'Name' }));
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Wave');
    await expandGroup(user, 'PAR [1]');
    await user.click(screen.getByRole('gridcell', { name: 'Dimmer · 1, Step 1' }));
    await user.keyboard('200{Enter}');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Wave',
        steps: [expect.objectContaining({ dmxValues: [expect.objectContaining({ channel: 1, value: 200 })] })],
      }),
    );
  });

  it('shows the selected step on channel sliders while live', async () => {
    const draft = initial();
    draft.steps = [
      { key: 's1', fadeIn: 0, hold: 0, fadeOut: 0, dmxValues: [{ key: 'd1', channel: 1, value: 80 }] },
      { key: 's2', fadeIn: 0, hold: 0, fadeOut: 0, dmxValues: [{ key: 'd2', channel: 1, value: 200 }] },
    ];
    draft.fixturePublicIds = ['par', 'wash'];
    dmxStore.getState().setStatus('open');
    const { user } = renderWithProviders(
      <SequenceEditor
        fixtures={fixtures}
        initial={draft}
        saving={false}
        consoleChannels={[4]}
        onSave={vi.fn()}
        onLeave={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('sequence-slider-panel')).not.toBeInTheDocument();
    await user.click(screen.getByRole('switch', { name: 'Live' }));
    expect(screen.getByRole('region', { name: 'PAR [1]' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Wash [2]' })).toBeInTheDocument();
    const sliders = screen.getAllByRole('slider');
    expect(sliders.map(slider => slider.getAttribute('aria-label'))).toEqual(['Dimmer · 1', 'Intensity · 5']);
    expect(sliders[0]).toHaveAttribute('aria-valuenow', '80');
    expect(sliders[1]).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByTestId('sequence-slider-icon-1')).toHaveAttribute(
      'data-preset',
      FixtureChannelPreset.IntensityDimmer,
    );
    expect(screen.getByTestId('sequence-slider-icon-1').querySelector('svg')).not.toBeNull();
    expect(screen.getByTestId('sequence-slider-icon-5')).toHaveAttribute(
      'data-preset',
      FixtureChannelPreset.IntensityRed,
    );
    expect(screen.getByTestId('sequence-slider-icon-5').querySelector('svg')).not.toBeNull();
    await expandGroup(user, 'PAR [1]');
    await expandGroup(user, 'Wash [2]');
    await user.click(screen.getByRole('gridcell', { name: 'Dimmer · 1, Step 2' }));
    expect(screen.getByRole('slider', { name: 'Dimmer · 1' })).toHaveAttribute('aria-valuenow', '200');
    screen.getByRole('slider', { name: 'Intensity · 5' }).focus();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('gridcell', { name: 'Intensity · 5, Step 2' })).toHaveTextContent('1');
  });

  it('disables Live while the DMX socket is not connected', () => {
    renderWithProviders(
      <SequenceEditor fixtures={fixtures} initial={initial()} saving={false} onSave={vi.fn()} onLeave={vi.fn()} />,
    );
    expect(screen.getByRole('switch', { name: 'Live' })).toBeDisabled();
  });

  it('stores captured live values as a new step', async () => {
    const { user } = renderWithProviders(
      <SequenceEditor fixtures={fixtures} initial={initial()} saving={false} onSave={vi.fn()} onLeave={vi.fn()} />,
    );
    act(() => {
      dmxStore.getState().applyDelta([{ channel: 1, value: 180 }]);
    });
    expect(screen.getByText('1 channel captured')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Store as step' }));
    await expandGroup(user, 'PAR [1]');
    expect(screen.getByRole('gridcell', { name: 'Dimmer · 1, Step 2' })).toHaveTextContent('180');
    expect(screen.getByText('0 channels captured')).toBeInTheDocument();
  });

  it('shows only the selected fixtures and adds more from the picker', async () => {
    const { user } = renderWithProviders(
      <SequenceEditor fixtures={fixtures} initial={initial()} saving={false} onSave={vi.fn()} onLeave={vi.fn()} />,
    );
    expect(screen.queryByRole('gridcell', { name: 'Intensity · 5, Step 1' })).not.toBeInTheDocument();
    await openFixtures(user);
    await user.click(screen.getByRole('checkbox', { name: 'Wash [2]' }));
    await expandGroup(user, 'Wash [2]');
    expect(screen.getByRole('gridcell', { name: 'Intensity · 5, Step 1' })).toBeInTheDocument();
  });

  it('asks before removing a fixture with values and then deletes them', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const { user } = renderWithProviders(
      <SequenceEditor fixtures={fixtures} initial={initial()} saving={false} onSave={onSave} onLeave={vi.fn()} />,
    );
    await expandGroup(user, 'PAR [1]');
    await user.click(screen.getByRole('gridcell', { name: 'Dimmer · 1, Step 1' }));
    await user.keyboard('200{Enter}');
    await openFixtures(user);
    await user.click(screen.getByRole('checkbox', { name: 'PAR [1]' }));
    await user.click(await screen.findByRole('button', { name: 'Remove' }));
    expect(screen.queryByRole('gridcell', { name: 'Dimmer · 1, Step 1' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ fixturePublicIds: [], steps: [expect.objectContaining({ dmxValues: [] })] }),
    );
  });

  it('leaves immediately when there are no changes', async () => {
    const onLeave = vi.fn();
    const { user } = renderWithProviders(
      <SequenceEditor fixtures={fixtures} initial={initial()} saving={false} onSave={vi.fn()} onLeave={onLeave} />,
    );
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('keeps the draft when save fails and when the leave or remove dialogs are cancelled', async () => {
    const onLeave = vi.fn();
    const onSave = vi.fn().mockResolvedValue(false);
    const { user } = renderWithProviders(
      <SequenceEditor fixtures={fixtures} initial={initial()} saving={false} onSave={onSave} onLeave={onLeave} />,
    );
    await expandGroup(user, 'PAR [1]');
    await user.click(screen.getByRole('gridcell', { name: 'Dimmer · 1, Step 1' }));
    await user.keyboard('200{Enter}');
    await openFixtures(user);
    await user.click(screen.getByRole('checkbox', { name: 'PAR [1]' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('gridcell', { name: 'Dimmer · 1, Step 1' })).toHaveTextContent('200');

    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
    });
    await user.click(screen.getByRole('button', { name: 'Back' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(onLeave).not.toHaveBeenCalled();
  });

  it('asks before leaving with unsaved changes', async () => {
    const onLeave = vi.fn();
    const { user } = renderWithProviders(
      <SequenceEditor fixtures={fixtures} initial={initial()} saving={false} onSave={vi.fn()} onLeave={onLeave} />,
    );
    await user.type(screen.getByRole('textbox', { name: 'Name' }), '!');
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(onLeave).not.toHaveBeenCalled();
    await user.click(await screen.findByRole('button', { name: 'Leave' }));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('treats the draft as clean after a successful save', async () => {
    const onLeave = vi.fn();
    const { user } = renderWithProviders(
      <SequenceEditor
        fixtures={fixtures}
        initial={initial()}
        saving={false}
        onSave={vi.fn().mockResolvedValue(true)}
        onLeave={onLeave}
      />,
    );
    await user.type(screen.getByRole('textbox', { name: 'Name' }), '!');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await user.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() => {
      expect(onLeave).toHaveBeenCalledTimes(1);
    });
  });
});
