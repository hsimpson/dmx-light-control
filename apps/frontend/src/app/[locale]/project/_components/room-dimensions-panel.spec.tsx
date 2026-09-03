import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RoomDimensionsPanel from './room-dimensions-panel';

describe('RoomDimensionsPanel', () => {
  it('saves the current width, length, and height', async () => {
    const onSave = vi.fn();
    const onWidthChange = vi.fn();
    const { user } = renderWithProviders(
      <RoomDimensionsPanel
        width={10}
        length={8}
        height={5}
        saving={false}
        onWidthChange={onWidthChange}
        onLengthChange={vi.fn()}
        onHeightChange={vi.fn()}
        onSave={onSave}
      />,
    );

    const widthInput = screen.getByLabelText('Width');
    await user.clear(widthInput);
    await user.type(widthInput, '12');
    expect(onWidthChange).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
