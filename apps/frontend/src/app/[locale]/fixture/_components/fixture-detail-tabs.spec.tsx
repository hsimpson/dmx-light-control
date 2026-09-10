import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FixtureDetailTabs from './fixture-detail-tabs';

const mockUseParams = vi.hoisted(() => vi.fn(() => ({ tab: 'general' })));
const push = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useParams: () => mockUseParams(),
  useRouter: () => ({ push, replace: vi.fn() }),
}));

describe('FixtureDetailTabs', () => {
  beforeEach(() => {
    mockUseParams.mockReturnValue({ tab: 'general' });
    push.mockClear();
  });

  it('renders tabs in order and shows the active tab panel from the route', () => {
    renderWithProviders(
      <FixtureDetailTabs
        fixturePublicId="fix-1"
        general={<div data-testid="general-panel" />}
        properties={<div data-testid="properties-panel" />}
        channels={<div data-testid="channels-panel" />}
        channelModes={<div data-testid="channel-modes-panel" />}
      />,
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map(tab => tab.textContent)).toEqual(['General', 'Properties', 'Channels', 'Channel modes']);
    expect(screen.getByTestId('general-panel')).toBeInTheDocument();
  });

  it('navigates via URL when a different tab is selected', async () => {
    const { user } = renderWithProviders(
      <FixtureDetailTabs
        fixturePublicId="fix-1"
        general={<div data-testid="general-panel" />}
        properties={<div data-testid="properties-panel" />}
        channels={<div data-testid="channels-panel" />}
        channelModes={<div data-testid="channel-modes-panel" />}
      />,
    );

    await user.click(screen.getByRole('tab', { name: 'Channels' }));

    expect(push).toHaveBeenCalledWith('/fixture/fix-1/channels');
  });

  it('shows the channels panel when the route tab is channels', () => {
    mockUseParams.mockReturnValue({ tab: 'channels' });

    renderWithProviders(
      <FixtureDetailTabs
        fixturePublicId="fix-1"
        general={<div data-testid="general-panel" />}
        properties={<div data-testid="properties-panel" />}
        channels={<div data-testid="channels-panel" />}
        channelModes={<div data-testid="channel-modes-panel" />}
      />,
    );

    expect(screen.getByTestId('channels-panel')).toBeInTheDocument();
  });
});
