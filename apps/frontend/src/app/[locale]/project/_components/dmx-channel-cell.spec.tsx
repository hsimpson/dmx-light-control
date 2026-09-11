import { dmxStore } from '@/lib/dmx/dmx-store';
import { FixtureChannelPreset } from '@/shared/types/graphql/graphql';
import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DmxChannelCell from './dmx-channel-cell';

describe('DmxChannelCell', () => {
  it('shows the live DMX value from the store', () => {
    dmxStore.getState().applyDelta([{ channel: 1, value: 128 }]);

    renderWithProviders(
      <DmxChannelCell
        absoluteChannelNumber={1}
        preset={FixtureChannelPreset.IntensityRed}
        tooltipLabel="Red intensity"
      />,
    );

    expect(screen.getByTestId('dmx-channel-1')).toHaveTextContent('128');
  });

  it('prefers an explicit DMX value over the live store', () => {
    dmxStore.getState().applyDelta([{ channel: 2, value: 200 }]);

    renderWithProviders(
      <DmxChannelCell
        absoluteChannelNumber={2}
        preset={FixtureChannelPreset.IntensityGreen}
        tooltipLabel="Green intensity"
        dmxValue={55}
      />,
    );

    expect(screen.getByTestId('dmx-channel-2')).toHaveTextContent('55');
  });
});
