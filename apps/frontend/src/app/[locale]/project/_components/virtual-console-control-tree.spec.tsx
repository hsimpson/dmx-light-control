import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import VirtualConsoleControlTree from './virtual-console-control-tree';
import { createControl, VIRTUAL_CONSOLE_RESIZE_HANDLES } from './virtual-console-document';

const noop = () => undefined;

describe('VirtualConsoleControlTree', () => {
  it('shows eight resize handles on a selected control in edit mode', () => {
    const control = { ...createControl('button', 10, 10), id: 'btn-1', label: 'Go' };
    renderWithProviders(
      <VirtualConsoleControlTree
        controls={[control]}
        mode="edit"
        selectedControlId="btn-1"
        onMovePointerDown={noop}
        onResizePointerDown={noop}
        onSelectControl={vi.fn()}
      />,
    );

    for (const handle of VIRTUAL_CONSOLE_RESIZE_HANDLES) {
      expect(screen.getByTestId(`virtual-console-resize-${handle}`)).toBeInTheDocument();
    }
  });

  it('does not show resize handles in play mode', () => {
    const control = { ...createControl('button', 10, 10), id: 'btn-1', label: 'Go' };
    renderWithProviders(
      <VirtualConsoleControlTree
        controls={[control]}
        mode="play"
        selectedControlId="btn-1"
        onMovePointerDown={noop}
        onResizePointerDown={noop}
        onSelectControl={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('virtual-console-resize-se')).not.toBeInTheDocument();
  });
});
