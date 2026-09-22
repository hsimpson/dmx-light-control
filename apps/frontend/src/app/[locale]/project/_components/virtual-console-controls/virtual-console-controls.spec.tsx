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
    expect(screen.getByTestId('virtual-console-frame-header')).toHaveTextContent('Group');
    expect(screen.getByTestId('virtual-console-frame-client')).toBeInTheDocument();
  });

  it('renders a button label and disables the button in edit mode', () => {
    const control = { ...createControl('button', 0, 0), label: 'Go' };
    renderWithProviders(<ButtonControl control={control} mode="edit" />);
    expect(screen.getByRole('button', { name: 'Go' })).toBeDisabled();
  });

  it('marks the button as pressed while the pointer is down in play mode', () => {
    const control = { ...createControl('button', 0, 0), label: 'Go' };
    renderWithProviders(<ButtonControl control={control} mode="play" />);
    const button = screen.getByRole('button', { name: 'Go' });
    expect(button).not.toHaveAttribute('data-pressed');

    fireEvent.pointerDown(button, { pointerId: 1 });
    expect(button).toHaveAttribute('data-pressed', 'true');

    fireEvent.pointerUp(button, { pointerId: 1 });
    expect(button).not.toHaveAttribute('data-pressed');
  });

  it('shows the slider label, value and handle', () => {
    const control = { ...createControl('slider', 0, 0), label: 'Dimmer' };
    renderWithProviders(<SliderControl control={control} mode="edit" />);
    expect(screen.getByTestId('virtual-console-slider')).toHaveTextContent('Dimmer');
    expect(screen.getByTestId('virtual-console-slider-value')).toHaveTextContent('0');
    expect(screen.getByTestId('virtual-console-slider-handle')).toBeInTheDocument();
  });

  it('applies the slider foreground color to the text, fill and handle', () => {
    const control = { ...createControl('slider', 0, 0), foregroundColor: '#ff00ff' };
    renderWithProviders(<SliderControl control={control} mode="edit" />);
    expect(screen.getByTestId('virtual-console-slider')).toHaveStyle({ color: '#ff00ff' });
    expect(screen.getByTestId('virtual-console-slider-fill')).toHaveStyle({ backgroundColor: '#ff00ff' });
    expect(screen.getByTestId('virtual-console-slider-handle')).toHaveStyle({ backgroundColor: '#ff00ff' });
  });

  it('applies font family, size and weight to buttons, frames and sliders', () => {
    const font = { fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 700 };
    renderWithProviders(
      <>
        <ButtonControl control={{ ...createControl('button', 0, 0), ...font, label: 'Go' }} mode="edit" />
        <FrameControl control={{ ...createControl('frame', 0, 0), ...font, label: 'Group' }} mode="edit" />
        <SliderControl control={{ ...createControl('slider', 0, 0), ...font, label: 'Dimmer' }} mode="edit" />
      </>,
    );
    expect(screen.getByTestId('virtual-console-button')).toHaveStyle({
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      fontWeight: '700',
    });
    expect(screen.getByTestId('virtual-console-frame-header')).toHaveStyle({
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      fontWeight: '700',
      height: '28px',
    });
    expect(screen.getByTestId('virtual-console-slider-label')).toHaveStyle({
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      fontWeight: '700',
    });
    expect(screen.getByTestId('virtual-console-slider-value')).toHaveStyle({
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      fontWeight: '700',
    });
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

  it('sizes the handle to half the slider width when vertical and half the height when horizontal', () => {
    const { unmount } = renderWithProviders(
      <SliderControl control={{ ...createControl('slider', 0, 0), width: 56, height: 160 }} mode="edit" />,
    );
    expect(screen.getByTestId('virtual-console-slider-handle')).toHaveStyle({ height: '24px', width: '28px' });
    unmount();

    renderWithProviders(
      <SliderControl
        control={{
          ...createControl('slider', 0, 0),
          orientation: 'horizontal',
          width: 160,
          height: 40,
        }}
        mode="edit"
      />,
    );
    expect(screen.getByTestId('virtual-console-slider-handle')).toHaveStyle({ height: '20px', width: '24px' });
  });

  it('ignores pointer and keyboard input on sliders in edit mode', () => {
    const control = { ...createControl('slider', 0, 0), label: 'Dimmer' };
    renderWithProviders(<SliderControl control={control} mode="edit" selected />);
    const rail = screen.getByTestId('virtual-console-slider-rail');
    mockRailRect(rail, { top: 0, left: 0, width: 40, height: 100 });

    fireEvent.pointerDown(rail, { clientX: 20, clientY: 0, pointerId: 1 });
    fireEvent.keyDown(screen.getByTestId('virtual-console-slider'), { key: 'ArrowUp' });
    expect(screen.getByTestId('virtual-console-slider-value')).toHaveTextContent('0');
  });

  it('steps a play-mode slider with arrow keys and ignores other keys', () => {
    const control = { ...createControl('slider', 0, 0), label: 'Dimmer' };
    renderWithProviders(<SliderControl control={control} mode="play" />);
    const slider = screen.getByRole('slider', { name: 'Dimmer' });

    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    expect(screen.getByTestId('virtual-console-slider-value')).toHaveTextContent('1');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(screen.getByTestId('virtual-console-slider-value')).toHaveTextContent('2');
    fireEvent.keyDown(slider, { key: 'ArrowDown' });
    expect(screen.getByTestId('virtual-console-slider-value')).toHaveTextContent('1');
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(screen.getByTestId('virtual-console-slider-value')).toHaveTextContent('0');
    fireEvent.keyDown(slider, { key: 'a' });
    expect(screen.getByTestId('virtual-console-slider-value')).toHaveTextContent('0');
  });

  it('does not move a play-mode slider until a pointer is captured', () => {
    const control = { ...createControl('slider', 0, 0), label: 'Dimmer' };
    renderWithProviders(<SliderControl control={control} mode="play" />);
    const rail = screen.getByTestId('virtual-console-slider-rail');
    mockRailRect(rail, { top: 0, left: 0, width: 40, height: 100 });

    fireEvent.pointerMove(rail, { clientX: 20, clientY: 0, pointerId: 1 });
    expect(screen.getByTestId('virtual-console-slider-value')).toHaveTextContent('0');

    fireEvent.pointerDown(rail, { clientX: 20, clientY: 0, pointerId: 1 });
    expect(screen.getByTestId('virtual-console-slider-value')).toHaveTextContent('255');
    fireEvent.pointerCancel(rail, { pointerId: 1 });
    expect(screen.getByTestId('virtual-console-slider-value')).toHaveTextContent('255');
  });

  it('clears a play-mode button press on pointer cancel', () => {
    const control = { ...createControl('button', 0, 0), label: 'Go' };
    renderWithProviders(<ButtonControl control={control} mode="play" selected />);
    const button = screen.getByRole('button', { name: 'Go' });
    fireEvent.pointerDown(button, { pointerId: 1 });
    expect(button).toHaveAttribute('data-pressed', 'true');
    fireEvent.pointerCancel(button);
    expect(button).not.toHaveAttribute('data-pressed');
  });

  it('does not press a button in edit mode', () => {
    const control = { ...createControl('button', 0, 0), label: 'Go' };
    renderWithProviders(<ButtonControl control={control} mode="edit" selected />);
    const button = screen.getByRole('button', { name: 'Go' });
    fireEvent.pointerDown(button, { pointerId: 1 });
    expect(button).not.toHaveAttribute('data-pressed');
  });

  it('reports play-mode slider and button values and stays quiet in edit mode', () => {
    const onSlider = vi.fn();
    const onButton = vi.fn();
    const slider = { ...createControl('slider', 0, 0), label: 'Dimmer' };
    const button = { ...createControl('button', 0, 0), label: 'Go' };
    const { unmount } = renderWithProviders(
      <>
        <SliderControl control={slider} mode="play" onPlayValue={onSlider} />
        <ButtonControl control={button} mode="play" onPlayValue={onButton} />
      </>,
    );
    const rail = screen.getByTestId('virtual-console-slider-rail');
    mockRailRect(rail, { top: 0, left: 0, width: 40, height: 100 });
    fireEvent.pointerDown(rail, { clientX: 20, clientY: 0, pointerId: 1 });
    expect(onSlider).toHaveBeenCalledWith(255);
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Dimmer' }), { key: 'ArrowDown' });
    expect(onSlider).toHaveBeenLastCalledWith(254);

    const playButton = screen.getByRole('button', { name: 'Go' });
    fireEvent.pointerDown(playButton, { pointerId: 1 });
    expect(onButton).toHaveBeenCalledWith(255);
    fireEvent.pointerUp(playButton, { pointerId: 1 });
    expect(onButton).toHaveBeenLastCalledWith(0);
    unmount();

    const onEdit = vi.fn();
    renderWithProviders(<SliderControl control={slider} mode="edit" onPlayValue={onEdit} />);
    const editRail = screen.getByTestId('virtual-console-slider-rail');
    mockRailRect(editRail, { top: 0, left: 0, width: 40, height: 100 });
    fireEvent.pointerDown(editRail, { clientX: 20, clientY: 0, pointerId: 1 });
    expect(onEdit).not.toHaveBeenCalled();
  });
});
