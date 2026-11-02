import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { screen, within } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import MidiFeedbackFields from './midi-feedback-fields';

const palette = {
  behaviors: [
    { name: 'Solid 100 %', value: 6, hex: null },
    { name: 'Blink 1/8', value: 13, hex: null },
  ],
  colors: [
    { name: 'Off', value: 0, hex: '#000000' },
    { name: 'Red', value: 5, hex: '#FF0000' },
    { name: 'Red again', value: 5, hex: '#FF0000' },
  ],
};
const feedback = { off: { behavior: 6, color: 0 }, on: { behavior: 6, color: 9 }, monitor: null };

describe('MidiFeedbackFields', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('GIVEN a palette WHEN rendered THEN states show names and an unlisted value as custom', () => {
    renderWithProviders(<MidiFeedbackFields palette={palette} value={feedback} onChange={vi.fn()} />);

    expect(screen.getByRole('combobox', { name: 'Off: Behavior (channel 0-15)' })).toHaveValue('Solid 100 %');
    expect(screen.getByRole('combobox', { name: 'Off: Color (velocity 0-127)' })).toHaveValue('Off');
    expect(screen.getByRole('combobox', { name: 'On: Color (velocity 0-127)' })).toHaveValue('Custom (9)');
  });

  it('GIVEN a palette WHEN a named behavior and color are picked THEN their numbers are stored', async () => {
    const onChange = vi.fn();
    const { user } = renderWithProviders(<MidiFeedbackFields palette={palette} value={feedback} onChange={onChange} />);

    const options = async (label: string) => {
      const input = screen.getByRole('combobox', { name: label });
      await user.click(input);
      const listbox = document.getElementById(input.getAttribute('aria-controls') ?? '');
      if (!listbox) {
        throw new Error(`no listbox for ${label}`);
      }
      return within(listbox);
    };

    const colors = await options('On: Color (velocity 0-127)');
    expect(colors.queryAllByRole('option', { name: 'Red again', hidden: true })).toHaveLength(0);
    await user.click(colors.getByRole('option', { name: 'Red', hidden: true }));
    const behaviors = await options('On: Behavior (channel 0-15)');
    await user.click(behaviors.getByRole('option', { name: 'Blink 1/8', hidden: true }));

    expect(onChange).toHaveBeenCalledWith({ ...feedback, on: { behavior: 6, color: 5 } });
    expect(onChange).toHaveBeenLastCalledWith({ ...feedback, on: { behavior: 13, color: 9 } });
  });

  it('GIVEN no palette WHEN rendered THEN behavior and color are number inputs', () => {
    renderWithProviders(<MidiFeedbackFields value={feedback} onChange={vi.fn()} />);

    expect(screen.getByLabelText('On: Color (velocity 0-127)')).toHaveValue('9');
  });
});
