import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { describe, expect, it } from 'vitest';
import { Loading } from './loading';

describe('Loading', () => {
  it('shows the message when provided', () => {
    const { getByText } = renderWithProviders(<Loading message="Please wait" />);
    expect(getByText('Please wait')).toBeInTheDocument();
  });

  it('omits the message when not provided', () => {
    const { container } = renderWithProviders(<Loading />);
    expect(container.querySelector('p')).toBeNull();
  });

  it('renders without a centering wrapper when centered is false', () => {
    const { container, getByText } = renderWithProviders(<Loading message="Inline" centered={false} />);
    expect(getByText('Inline')).toBeInTheDocument();
    expect(container.querySelector('.mantine-Center-root')).toBeNull();
  });
});
