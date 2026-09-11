import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FixtureTabEmptyState from './fixture-tab-empty-state';

describe('FixtureTabEmptyState', () => {
  it('shows the provided message', () => {
    renderWithProviders(<FixtureTabEmptyState message="No channel modes yet" />);
    expect(screen.getByText('No channel modes yet')).toBeInTheDocument();
  });
});
