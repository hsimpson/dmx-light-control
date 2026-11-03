import { dmxStore, resetDmxStore } from '@/lib/dmx/dmx-store';
import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createControl } from '../virtual-console-document';
import AudioTriggersControl from './audio-triggers-control';

const audioControl = () => ({ ...createControl('audioTriggers', 0, 0), label: 'Sound' });

describe('AudioTriggersControl', () => {
  afterEach(() => {
    resetDmxStore();
  });

  it('GIVEN edit mode WHEN rendered THEN the toggle is disabled and a meter is shown per bar', () => {
    renderWithProviders(<AudioTriggersControl control={audioControl()} mode="edit" />);

    expect(screen.getByRole('button', { name: 'Sound' })).toBeDisabled();
    expect(screen.getByRole('meter', { name: 'Volume level' })).toBeInTheDocument();
    expect(screen.getAllByRole('meter')).toHaveLength(9);
  });

  it('GIVEN play mode WHEN the toggle is pressed and released THEN it sends 1 then 0', () => {
    const onPlayValue = vi.fn();
    renderWithProviders(<AudioTriggersControl control={audioControl()} mode="play" onPlayValue={onPlayValue} />);

    const toggle = screen.getByRole('button', { name: 'Sound' });
    fireEvent.pointerDown(toggle);
    fireEvent.pointerUp(toggle);

    expect(onPlayValue.mock.calls).toEqual([[1], [0]]);
  });

  it('GIVEN a press WHEN the pointer is cancelled THEN 0 is still sent, so the next press toggles again', () => {
    const onPlayValue = vi.fn();
    renderWithProviders(<AudioTriggersControl control={audioControl()} mode="play" onPlayValue={onPlayValue} />);

    const toggle = screen.getByRole('button', { name: 'Sound' });
    fireEvent.pointerDown(toggle);
    fireEvent.pointerCancel(toggle);
    fireEvent.pointerDown(toggle);

    expect(onPlayValue.mock.calls).toEqual([[1], [0], [1]]);
  });

  it('GIVEN an enabled control WHEN levels arrive THEN the meters show them, and drop to 0 when disabled', () => {
    const control = audioControl();
    renderWithProviders(<AudioTriggersControl control={control} mode="play" />);

    act(() => {
      dmxStore.getState().setControlValues({ [control.id]: 255 });
      dmxStore.getState().setAudioLevels({ [control.id]: [0.5, 1] });
    });
    const enabledVolume = screen.getByRole('meter', { name: 'Volume level' }).getAttribute('aria-valuenow');
    const enabledBand = screen.getByRole('meter', { name: 'Band 1 level' }).getAttribute('aria-valuenow');
    act(() => {
      dmxStore.getState().setControlValues({ [control.id]: 0 });
    });

    expect([enabledVolume, enabledBand]).toEqual(['50', '100']);
    expect(screen.getByRole('button', { name: 'Sound' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('meter', { name: 'Volume level' })).toHaveAttribute('aria-valuenow', '0');
  });
});
