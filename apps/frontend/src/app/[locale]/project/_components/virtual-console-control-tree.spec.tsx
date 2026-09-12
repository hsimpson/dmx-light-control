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

  it('marks a frame as the drop target while parenting', () => {
    const frame = { ...createControl('frame', 0, 0), id: 'frame-1', label: 'Frame' };
    const other = { ...createControl('frame', 240, 0), id: 'frame-2', label: 'Other' };
    renderWithProviders(
      <VirtualConsoleControlTree
        controls={[frame, other]}
        dropTargetControlId="frame-1"
        mode="edit"
        selectedControlId={null}
        onMovePointerDown={noop}
        onResizePointerDown={noop}
        onSelectControl={vi.fn()}
      />,
    );

    const frames = screen.getAllByTestId('virtual-console-frame');
    expect(frames[0]).toHaveAttribute('data-drop-target', 'true');
    expect(frames[1]).not.toHaveAttribute('data-drop-target');
  });

  it('keeps a dragged control and its ancestor frames in front', () => {
    const nested = { ...createControl('button', 10, 10), id: 'btn-1', label: 'Go' };
    const frame = { ...createControl('frame', 0, 0), id: 'frame-1', label: 'Frame', children: [nested] };
    const other = { ...createControl('frame', 240, 0), id: 'frame-2', label: 'Other' };
    renderWithProviders(
      <VirtualConsoleControlTree
        controls={[frame, other]}
        draggingControlId="btn-1"
        mode="edit"
        selectedControlId="btn-1"
        onMovePointerDown={noop}
        onResizePointerDown={noop}
        onSelectControl={vi.fn()}
      />,
    );

    expect(screen.getByTestId('virtual-console-control-btn-1')).toHaveStyle({ zIndex: '2' });
    expect(screen.getByTestId('virtual-console-control-frame-1')).toHaveStyle({ zIndex: '2' });
    expect(screen.getByTestId('virtual-console-control-frame-2')).not.toHaveStyle({ zIndex: '2' });
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
