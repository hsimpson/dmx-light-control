import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { ProjectEnvironmentType } from '@/shared/types/graphql/graphql';
import { screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import RoomDimensionsPanel from './room-dimensions-panel';

describe('RoomDimensionsPanel', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });
  it('saves the current width, length, and height', async () => {
    const onSave = vi.fn();
    const onWidthChange = vi.fn();
    const { user } = renderWithProviders(
      <RoomDimensionsPanel
        environmentType={ProjectEnvironmentType.SimpleGround}
        width={10}
        length={8}
        height={5}
        saving={false}
        onEnvironmentTypeChange={vi.fn()}
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

  it('changes the environment from a dropdown', async () => {
    const onEnvironmentTypeChange = vi.fn();
    const { user } = renderWithProviders(
      <RoomDimensionsPanel
        environmentType={ProjectEnvironmentType.SimpleGround}
        width={10}
        length={8}
        height={5}
        saving={false}
        onEnvironmentTypeChange={onEnvironmentTypeChange}
        onWidthChange={vi.fn()}
        onLengthChange={vi.fn()}
        onHeightChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('combobox', { name: 'Environment' }));
    await user.click(await screen.findByText('Room'));
    expect(onEnvironmentTypeChange).toHaveBeenCalledWith(ProjectEnvironmentType.Room);
  });
});
