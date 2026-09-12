import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createControl, createDefaultVirtualConsoleDocument } from './virtual-console-document';
import VirtualConsoleSidebar from './virtual-console-sidebar';

describe('virtual console sidebar', () => {
  it('applies a standard palette swatch to the selected control', async () => {
    const control = createControl('button', 0, 0);
    const document = createDefaultVirtualConsoleDocument();
    const onControlPatch = vi.fn();
    const { user } = renderWithProviders(
      <VirtualConsoleSidebar
        document={document}
        dirty={false}
        onCanvasSizeChange={vi.fn()}
        onControlPatch={onControlPatch}
        onDeleteControl={vi.fn()}
        onPageNameChange={vi.fn()}
        onSave={vi.fn()}
        onSelectCanvas={vi.fn()}
        saving={false}
        selectedControl={control}
        selectedPage={document.pages[0]}
        selection={{ kind: 'control', controlId: control.id }}
      />,
    );

    const background = screen.getByLabelText('Background');
    fireEvent.focus(background);
    const redSwatch = await screen.findByRole('button', { name: '#ff0000' });
    await user.click(redSwatch);
    expect(onControlPatch).toHaveBeenCalledWith({ backgroundColor: '#ff0000' });
  });

  it('applies font family, size and weight from the font modal', async () => {
    const control = createControl('button', 0, 0);
    const document = createDefaultVirtualConsoleDocument();
    const onControlPatch = vi.fn();
    const { user } = renderWithProviders(
      <VirtualConsoleSidebar
        document={document}
        dirty={false}
        onCanvasSizeChange={vi.fn()}
        onControlPatch={onControlPatch}
        onDeleteControl={vi.fn()}
        onPageNameChange={vi.fn()}
        onSave={vi.fn()}
        onSelectCanvas={vi.fn()}
        saving={false}
        selectedControl={control}
        selectedPage={document.pages[0]}
        selection={{ kind: 'control', controlId: control.id }}
      />,
    );

    expect(screen.getByLabelText('Font')).toHaveValue('System UI · 16px · Semibold');

    await user.click(screen.getByLabelText('Font'));
    expect(await screen.findByTestId('virtual-console-font-preview')).toBeInTheDocument();
    await user.click(screen.getByTestId('virtual-console-font-apply'));
    expect(onControlPatch).toHaveBeenCalledWith({
      fontFamily: control.fontFamily,
      fontSize: control.fontSize,
      fontWeight: control.fontWeight,
    });
  });

  it('deletes the selected control from the sidebar', async () => {
    const control = createControl('button', 0, 0);
    const document = createDefaultVirtualConsoleDocument();
    const onDeleteControl = vi.fn();
    const { user } = renderWithProviders(
      <VirtualConsoleSidebar
        document={document}
        dirty={false}
        onCanvasSizeChange={vi.fn()}
        onControlPatch={vi.fn()}
        onDeleteControl={onDeleteControl}
        onPageNameChange={vi.fn()}
        onSave={vi.fn()}
        onSelectCanvas={vi.fn()}
        saving={false}
        selectedControl={control}
        selectedPage={document.pages[0]}
        selection={{ kind: 'control', controlId: control.id }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Delete control' }));
    expect(onDeleteControl).toHaveBeenCalledTimes(1);
  });
});
