import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectDetailTabs from './project-detail-tabs';

const mockUseParams = vi.hoisted(() => vi.fn(() => ({ tab: 'fixtures' })));
const push = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useParams: () => mockUseParams(),
  useRouter: () => ({ push, replace: vi.fn() }),
}));

vi.mock('./project-fixture-table', () => ({
  default: () => <div data-testid="project-fixture-table" />,
}));

vi.mock('./universe-view', () => ({
  default: () => <div data-testid="universe-view" />,
}));

vi.mock('./dmx-view', () => ({
  default: () => <div data-testid="dmx-view" />,
}));

vi.mock('./three-d-view', () => ({
  default: () => <div data-testid="three-d-view" />,
}));

describe('ProjectDetailTabs', () => {
  beforeEach(() => {
    mockUseParams.mockReturnValue({ tab: 'fixtures' });
    push.mockClear();
  });

  it('renders tabs in order and shows the active tab panel from the route', () => {
    renderWithProviders(<ProjectDetailTabs projectPublicId="proj-1" />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map(tab => tab.textContent)).toEqual(['Fixtures', 'Universe View', 'DMX View', '2D View', '3D View']);
    expect(screen.getByTestId('project-fixture-table')).toBeInTheDocument();
  });

  it('navigates via URL when a different tab is selected', async () => {
    const { user } = renderWithProviders(<ProjectDetailTabs projectPublicId="proj-1" />);

    await user.click(screen.getByRole('tab', { name: '3D View' }));

    expect(push).toHaveBeenCalledWith('/project/proj-1/3d');
  });

  it('shows the 3D view panel when the route tab is 3d', () => {
    mockUseParams.mockReturnValue({ tab: '3d' });

    renderWithProviders(<ProjectDetailTabs projectPublicId="proj-1" />);

    expect(screen.getByTestId('three-d-view')).toBeInTheDocument();
  });

  it('shows the DMX view panel when the route tab is dmx', () => {
    mockUseParams.mockReturnValue({ tab: 'dmx' });

    renderWithProviders(<ProjectDetailTabs projectPublicId="proj-1" />);

    expect(screen.getByTestId('dmx-view')).toBeInTheDocument();
  });
});
