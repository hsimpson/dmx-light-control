import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VIRTUAL_CONSOLE_RESIZE_HANDLES } from '../virtual-console-document';
import ResizeHandles from './resize-handles';

vi.mock('./resize-handles.module.css', () => ({
  default: {},
}));

describe('ResizeHandles', () => {
  it('renders every handle and forwards pointer down', () => {
    const onResizePointerDown = vi.fn();
    renderWithProviders(<ResizeHandles onResizePointerDown={onResizePointerDown} />);

    for (const handle of VIRTUAL_CONSOLE_RESIZE_HANDLES) {
      expect(screen.getByTestId(`virtual-console-resize-${handle}`)).toBeInTheDocument();
    }

    fireEvent.pointerDown(screen.getByTestId('virtual-console-resize-n'), { pointerId: 1 });
    expect(onResizePointerDown).toHaveBeenCalledWith('n', expect.anything());
  });
});
