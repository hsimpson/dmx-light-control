import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './app';

vi.mock('next/navigation', () => ({
  usePathname: () => '/en',
}));

vi.mock('next-i18n-router/client', () => ({
  useCurrentLocale: () => 'en',
}));

vi.mock('@/lib/dmx/dmx-socket-connector', () => ({
  DmxSocketConnector: () => null,
}));

describe('App', () => {
  it('keeps the navigation expanded by default and can collapse it', async () => {
    const { user } = renderWithProviders(
      <App>
        <div>content</div>
      </App>,
    );

    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Collapse navigation' }));
    expect(screen.getByRole('button', { name: 'Expand navigation' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Expand navigation' }));
    expect(screen.getByRole('button', { name: 'Collapse navigation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
  });
});
