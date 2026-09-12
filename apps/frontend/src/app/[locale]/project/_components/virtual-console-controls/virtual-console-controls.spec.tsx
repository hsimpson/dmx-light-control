import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createControl } from '../virtual-console-document';
import ButtonControl from './button-control';
import FrameControl from './frame-control';
import SliderControl from './slider-control';

const mockRailRect = (rail: HTMLElement, rect: Pick<DOMRect, 'top' | 'left' | 'width' | 'height'>) => {
  vi.spyOn(rail, 'getBoundingClientRect').mockReturnValue({
    x: rect.left,
    y: rect.top,
    top: rect.top,
    left: rect.left,
    bottom: rect.top + rect.height,
    right: rect.left + rect.width,
    width: rect.width,
    height: rect.height,
    toJSON: () => ({}),
  });
};

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

  it('shows the slider label, value and handle', () => {
    const control = { ...createControl('slider', 0, 0), label: 'Dimmer' };
    renderWithProviders(<SliderControl control={control} mode="edit" />);
    expect(screen.getByTestId('virtual-console-slider')).toHaveTextContent('Dimmer');
    expect(screen.getByTestId('virtual-console-slider-value')).toHaveTextContent('0');
    expect(screen.getByTestId('virtual-console-slider-handle')).toBeInTheDocument();
  });

  it('shows percentage values with a percent sign', () => {
    const control = { ...createControl('slider', 0, 0), label: 'Master', valueType: 'percentage' as const };
    renderWithProviders(<SliderControl control={control} mode="edit" />);
    expect(screen.getByTestId('virtual-console-slider-value')).toHaveTextContent('0%');
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

  it('maps vertical pointer position to the slider value in play mode', () => {
    const control = { ...createControl('slider', 0, 0), label: 'Dimmer' };
    renderWithProviders(<SliderControl control={control} mode="play" />);
    const rail = screen.getByTestId('virtual-console-slider-rail');
    mockRailRect(rail, { top: 0, left: 0, width: 40, height: 100 });

    fireEvent.pointerDown(rail, { clientX: 20, clientY: 0, pointerId: 1 });
    expect(screen.getByTestId('virtual-console-slider-value')).toHaveTextContent('255');

    fireEvent.pointerMove(rail, { clientX: 20, clientY: 100, pointerId: 1 });
    expect(screen.getByTestId('virtual-console-slider-value')).toHaveTextContent('0');

    fireEvent.pointerMove(rail, { clientX: 38, clientY: 50, pointerId: 1 });
    expect(screen.getByTestId('virtual-console-slider-value')).toHaveTextContent('128');
  });

  it('maps horizontal pointer position to the slider value in play mode', () => {
    const control = { ...createControl('slider', 0, 0), label: 'Pan', orientation: 'horizontal' as const };
    renderWithProviders(<SliderControl control={control} mode="play" />);
    const rail = screen.getByTestId('virtual-console-slider-rail');
    mockRailRect(rail, { top: 0, left: 0, width: 100, height: 24 });

    fireEvent.pointerDown(rail, { clientX: 100, clientY: 12, pointerId: 1 });
    expect(screen.getByTestId('virtual-console-slider-value')).toHaveTextContent('255');
  });
});
