import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProjectTabEmptyState from './project-tab-empty-state';

describe('ProjectTabEmptyState', () => {
  it('shows the provided message', () => {
    renderWithProviders(<ProjectTabEmptyState message="No fixtures patched yet" />);
    expect(screen.getByText('No fixtures patched yet')).toBeInTheDocument();
  });
});
