import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { describe, expect, it } from 'vitest';
import { DateTime } from './date-time';

describe('DateTime', () => {
  it('renders a time element with an ISO dateTime attribute', () => {
    const date = new Date('2026-01-15T12:30:00.000Z');
    const { container } = renderWithProviders(<DateTime date={date} />);
    const time = container.querySelector('time');

    expect(time).not.toBeNull();
    expect(time?.getAttribute('dateTime')).toBe(date.toISOString());
    expect(time?.textContent).toBeTruthy();
  });
});
