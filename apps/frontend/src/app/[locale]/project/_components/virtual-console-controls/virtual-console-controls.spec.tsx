import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createControl } from '../virtual-console-document';
import ButtonControl from './button-control';
import FrameControl from './frame-control';
import SliderControl from './slider-control';

describe('virtual console controls', () => {
  it('renders a frame label', () => {
    const control = { ...createControl('frame', 0, 0), label: 'Group' };
    renderWithProviders(<FrameControl control={control} mode="edit" />);
    expect(screen.getByTestId('virtual-console-frame')).toHaveTextContent('Group');
  });

  it('renders a button label and disables the button in edit mode', () => {
    const control = { ...createControl('button', 0, 0), label: 'Go' };
    renderWithProviders(<ButtonControl control={control} mode="edit" />);
    expect(screen.getByRole('button', { name: 'Go' })).toBeDisabled();
  });

  it('exposes a range input in play mode for sliders', () => {
    const control = { ...createControl('slider', 0, 0), label: 'Dimmer' };
    renderWithProviders(<SliderControl control={control} mode="play" />);
    expect(screen.getByRole('slider', { name: 'Dimmer' })).toBeInTheDocument();
  });

  it('does not expose a range input in edit mode for sliders', () => {
    const control = { ...createControl('slider', 0, 0), label: 'Dimmer' };
    renderWithProviders(<SliderControl control={control} mode="edit" />);
    expect(screen.queryByRole('slider', { name: 'Dimmer' })).not.toBeInTheDocument();
  });
});
