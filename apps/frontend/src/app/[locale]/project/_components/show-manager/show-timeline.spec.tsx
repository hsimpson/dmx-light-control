import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ShowDocument } from './show-document';
import ShowTimeline from './show-timeline';

const show: ShowDocument = {
  publicId: 'show-1',
  name: 'Opening',
  durationMs: 10_000,
  beatsMs: [],
  audioClips: [
    {
      publicId: 'audio-1',
      fileName: 'intro.mp3',
      startMs: 0,
      durationMs: 10_000,
      beatsMs: [0, 2000, 4000],
      peaks: [0.5],
    },
  ],
  lightTracks: [
    {
      id: 'track-1',
      name: 'Front',
      clips: [{ id: 'clip-1', functionPublicId: 'fn-1', startMs: 1000, durationMs: 1000, followBeat: true }],
    },
  ],
};

function renderTimeline() {
  const onChange = vi.fn<(next: ShowDocument) => void>();
  const onSelect = vi.fn();
  const view = renderWithProviders(
    <ShowTimeline
      show={show}
      functionNames={new Map([['fn-1', 'Chase']])}
      pixelsPerSecond={100}
      playheadMs={0}
      selection={null}
      selectedTrackId={null}
      onSelect={onSelect}
      onSelectTrack={vi.fn()}
      onChange={onChange}
      onSeek={vi.fn()}
    />,
  );
  const lastChange = () => onChange.mock.calls.at(-1)?.[0];
  return { ...view, onChange, onSelect, lastChange };
}

describe('ShowTimeline', () => {
  it('GIVEN a light clip WHEN dragged near a beat THEN its start snaps onto the beat', () => {
    const { onSelect, lastChange } = renderTimeline();
    const clip = screen.getByRole('button', { name: 'Chase' });

    fireEvent.pointerDown(clip, { clientX: 0 });
    // 95 px at 100 px/s is 950 ms: 1950 ms lands within the 80 ms snap of the beat at 2000 ms.
    fireEvent.pointerMove(clip, { clientX: 95 });
    fireEvent.pointerUp(clip);

    expect(onSelect).toHaveBeenCalledWith({ kind: 'light', id: 'clip-1' });
    expect(lastChange()?.lightTracks[0]?.clips[0]?.startMs).toBe(2000);
  });

  it('GIVEN a light clip WHEN its right edge is dragged far from beats THEN only its length changes', () => {
    const { container, lastChange } = renderTimeline();
    const handle = container.querySelector('[aria-hidden="true"]:not(svg)');
    if (!handle) throw new Error('resize handle missing');

    fireEvent.pointerDown(handle, { clientX: 0 });
    fireEvent.pointerMove(handle, { clientX: 50 });

    expect(lastChange()?.lightTracks[0]?.clips[0]).toMatchObject({ startMs: 1000, durationMs: 1500 });
  });

  it('GIVEN a light clip WHEN shrunk below the minimum THEN it keeps the minimum length', () => {
    const { container, lastChange } = renderTimeline();
    const handle = container.querySelector('[aria-hidden="true"]:not(svg)');
    if (!handle) throw new Error('resize handle missing');

    fireEvent.pointerDown(handle, { clientX: 0 });
    fireEvent.pointerMove(handle, { clientX: -500 });

    expect(lastChange()?.lightTracks[0]?.clips[0]?.durationMs).toBe(100);
  });

  it('GIVEN an audio clip WHEN dragged THEN it moves on the audio track and its beats with it', () => {
    const { onSelect, lastChange } = renderTimeline();
    const clip = screen.getByRole('button', { name: 'intro.mp3' });

    fireEvent.pointerDown(clip, { clientX: 0 });
    fireEvent.pointerMove(clip, { clientX: 130 });

    expect(onSelect).toHaveBeenCalledWith({ kind: 'audio', id: 'audio-1' });
    expect(lastChange()?.audioClips[0]?.startMs).toBe(1300);
  });

  it('GIVEN an audio clip with a beat near its start WHEN dragged slowly THEN its own beats do not hold it back', () => {
    const { lastChange } = renderTimeline();
    const clip = screen.getByRole('button', { name: 'intro.mp3' });

    fireEvent.pointerDown(clip, { clientX: 0 });
    // 3 px = 30 ms: its own beat at 0 ms would pull the start back to 0.
    fireEvent.pointerMove(clip, { clientX: 3 });

    expect(lastChange()?.audioClips[0]?.startMs).toBe(30);
  });

  it('GIVEN a drag WHEN the pointer is cancelled THEN later moves no longer change anything', () => {
    const { onChange } = renderTimeline();
    const clip = screen.getByRole('button', { name: 'Chase' });

    fireEvent.pointerDown(clip, { clientX: 0 });
    fireEvent.pointerCancel(clip);
    fireEvent.pointerMove(clip, { clientX: 300 });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('GIVEN a focused clip WHEN Enter is pressed THEN it is selected', () => {
    const { onSelect } = renderTimeline();

    fireEvent.keyDown(screen.getByRole('button', { name: 'Chase' }), { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith({ kind: 'light', id: 'clip-1' });
  });
});
