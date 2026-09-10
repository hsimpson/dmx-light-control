import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FixtureProperties from './fixture-properties';

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

vi.mock('./fixture-model-preview', () => ({
  default: () => <div data-testid="model-preview" />,
}));

describe('FixtureProperties', () => {
  it('renders dimension and asset sections', () => {
    renderWithProviders(
      <FixtureProperties
        fixturePublicId="fix-1"
        values={{
          weight: 4,
          width: 0.2,
          length: 0.3,
          height: 0.4,
          picturePath: null,
          picture2dPath: null,
          model3dPath: null,
        }}
        onDimensionsChange={vi.fn()}
        onAssetPathChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Dimensions' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Assets' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Weight' })).toHaveValue('4 kg');
    expect(screen.getByTestId('model-preview')).toBeInTheDocument();
  });
});
