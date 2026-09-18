import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createControl } from './virtual-console-document';
import VirtualConsoleFontModal from './virtual-console-font-modal';
import {
  VIRTUAL_CONSOLE_DEFAULT_FONT_FAMILY,
  VIRTUAL_CONSOLE_DEFAULT_FONT_SIZE,
  VIRTUAL_CONSOLE_DEFAULT_FONT_WEIGHT,
} from './virtual-console-fonts';

describe('VirtualConsoleFontModal', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });
  it('uses default font values and preview fallback when the control has none', () => {
    const control = {
      ...createControl('button', 0, 0),
      fontFamily: undefined,
      fontSize: undefined,
      fontWeight: undefined,
      label: '',
    };
    renderWithProviders(<VirtualConsoleFontModal opened control={control} onApply={vi.fn()} onClose={vi.fn()} />);

    const preview = screen.getByTestId('virtual-console-font-preview');
    expect(preview).toHaveTextContent('Preview');
    expect(preview).toHaveStyle({
      fontFamily: VIRTUAL_CONSOLE_DEFAULT_FONT_FAMILY,
      fontSize: `${VIRTUAL_CONSOLE_DEFAULT_FONT_SIZE}px`,
      fontWeight: String(VIRTUAL_CONSOLE_DEFAULT_FONT_WEIGHT),
    });
  });

  it('applies the chosen family, size and weight then closes', async () => {
    const onApply = vi.fn();
    const onClose = vi.fn();
    const { user } = renderWithProviders(
      <VirtualConsoleFontModal
        opened
        control={{ ...createControl('button', 0, 0), label: 'Go' }}
        onApply={onApply}
        onClose={onClose}
      />,
    );

    expect(screen.getByTestId('virtual-console-font-preview')).toHaveTextContent('Go');

    await user.click(screen.getByRole('combobox', { name: 'Font family' }));
    await user.click(await screen.findByText('Georgia'));
    await user.click(screen.getByRole('combobox', { name: 'Font size' }));
    await user.click(await screen.findByText('20px'));
    await user.click(screen.getByRole('combobox', { name: 'Font weight' }));
    await user.click(await screen.findByText('Bold'));

    expect(screen.getByTestId('virtual-console-font-preview')).toHaveStyle({
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      fontWeight: '700',
    });

    await user.click(screen.getByTestId('virtual-console-font-apply'));
    expect(onApply).toHaveBeenCalledWith({
      fontFamily: 'Georgia, serif',
      fontSize: 20,
      fontWeight: 700,
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cancels without applying', async () => {
    const onApply = vi.fn();
    const onClose = vi.fn();
    const { user } = renderWithProviders(
      <VirtualConsoleFontModal opened control={createControl('button', 0, 0)} onApply={onApply} onClose={onClose} />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onApply).not.toHaveBeenCalled();
  });
});
