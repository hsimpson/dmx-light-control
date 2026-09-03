import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProjectDetailTabs from './project-detail-tabs';

vi.mock('./project-fixture-table', () => ({
  default: () => <div data-testid="project-fixture-table" />,
}));

vi.mock('./universe-view', () => ({
  default: () => <div data-testid="universe-view" />,
}));

describe('ProjectDetailTabs', () => {
  it('renders tabs in order and shows the empty state for 2D View', async () => {
    const { user } = renderWithProviders(<ProjectDetailTabs projectPublicId="proj-1" />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map(tab => tab.textContent)).toEqual(['Fixtures', 'Universe View', 'DMX View', '2D View', '3D View']);

    await user.click(screen.getByRole('tab', { name: '2D View' }));

    expect(screen.getByRole('tabpanel')).toHaveTextContent('This view is not available yet.');
  });
});
