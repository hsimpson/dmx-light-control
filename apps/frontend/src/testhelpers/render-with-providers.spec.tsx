import { useTranslation } from '@/lib/i18n/use-translation';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from './render-with-providers';

const Hello = () => {
  const { t } = useTranslation();
  return <span>{t({ id: 'test.hello', defaultMessage: 'Hello' })}</span>;
};

describe('renderWithProviders', () => {
  it('renders a child that uses useTranslation', () => {
    const { getByText } = renderWithProviders(<Hello />);
    expect(getByText('Hello')).toBeInTheDocument();
  });
});
