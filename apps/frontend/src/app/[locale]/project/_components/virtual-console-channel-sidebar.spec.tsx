import { FixtureChannelPreset } from '@/shared/types/graphql/graphql';
import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createControl } from './virtual-console-document';
import VirtualConsoleChannelSidebar, { type VirtualConsoleAssignableFixture } from './virtual-console-channel-sidebar';

describe('virtual console channel sidebar', () => {
  it('assigns and removes fixture channels', async () => {
    const control = createControl('slider', 0, 0);
    const onPatch = vi.fn();
    const fixtures: VirtualConsoleAssignableFixture[] = [
      {
        publicId: 'pf-b',
        startAddress: 20,
        fixture: { name: 'Wash', fixtureVendor: { name: 'Acme' } },
        channelMode: {
          name: '2ch',
          fixtureChannelAssignments: [
            {
              publicId: 'assign-dimmer',
              channelNumber: 1,
              fixtureChannelDefinition: { name: 'Dimmer', preset: FixtureChannelPreset.IntensityDimmer },
            },
          ],
        },
      },
      {
        publicId: 'pf-a',
        startAddress: 1,
        fixture: { name: 'Par', fixtureVendor: { name: 'Generic' } },
        channelMode: {
          name: '3ch',
          fixtureChannelAssignments: [
            {
              publicId: 'assign-red',
              channelNumber: 1,
              fixtureChannelDefinition: { name: 'Red', preset: FixtureChannelPreset.IntensityRed },
            },
          ],
        },
      },
    ];
    const { user } = renderWithProviders(
      <VirtualConsoleChannelSidebar
        control={{
          ...control,
          channelBindings: [
            { projectFixturePublicId: 'pf-missing', channelAssignmentPublicId: 'assign-missing' },
            { projectFixturePublicId: 'pf-a', channelAssignmentPublicId: 'assign-red' },
          ],
        }}
        fixtures={fixtures}
        onPatch={onPatch}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Clear assignments' }));
    expect(onPatch).toHaveBeenCalledWith({ channelBindings: undefined });
    onPatch.mockClear();

    const par = screen.getByRole('button', { name: 'Par [1] 1/1' });
    expect(screen.getByRole('button', { name: 'Wash [2] 0/1' })).toHaveAttribute('aria-expanded', 'false');
    expect(par).toHaveAttribute('aria-expanded', 'false');

    await user.click(par);
    expect(par).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('virtual-console-channel-icon-assign-red').querySelector('svg')).not.toBeNull();

    await user.click(screen.getByRole('checkbox', { name: '1 · Red' }));
    expect(onPatch).toHaveBeenCalledWith({
      channelBindings: [{ projectFixturePublicId: 'pf-missing', channelAssignmentPublicId: 'assign-missing' }],
    });

    onPatch.mockClear();
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onPatch).toHaveBeenCalledWith({
      channelBindings: [{ projectFixturePublicId: 'pf-a', channelAssignmentPublicId: 'assign-red' }],
    });

    await user.click(par);
    expect(par).toHaveAttribute('aria-expanded', 'false');
  });
});
