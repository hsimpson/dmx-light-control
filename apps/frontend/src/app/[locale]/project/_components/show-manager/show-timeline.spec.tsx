import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ShowDocument } from './show-document';
import ShowTimeline, { type ShowSelection } from './show-timeline';

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
    { id: 'track-2', name: 'Back', clips: [] },
  ],
  cues: [{ id: 'cue-1', name: 'Chorus', ms: 3000 }],
};

function renderTimeline(selection: ShowSelection = null) {
  const onChange = vi.fn<(next: ShowDocument) => void>();
  const onSelect = vi.fn();
  const onSeek = vi.fn();
  const view = renderWithProviders(
    <ShowTimeline
      show={show}
      functionNames={new Map([['fn-1', 'Chase']])}
      pixelsPerSecond={100}
      playheadMs={0}
      selection={selection}
      selectedTrackId={null}
      onSelect={onSelect}
      onSelectTrack={vi.fn()}
      onChange={onChange}
      onSeek={onSeek}
    />,
  );
  const lastChange = () => onChange.mock.calls.at(-1)?.[0];
  return { ...view, onChange, onSelect, onSeek, lastChange };
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
    const { lastChange } = renderTimeline();
    const handle = screen.getByRole('button', { name: 'Chase' }).querySelector('[aria-hidden="true"]');
    if (!handle) throw new Error('resize handle missing');

    fireEvent.pointerDown(handle, { clientX: 0 });
    fireEvent.pointerMove(handle, { clientX: 50 });

    expect(lastChange()?.lightTracks[0]?.clips[0]).toMatchObject({ startMs: 1000, durationMs: 1500 });
  });

  it('GIVEN a light clip WHEN shrunk below the minimum THEN it keeps the minimum length', () => {
    const { lastChange } = renderTimeline();
    const handle = screen.getByRole('button', { name: 'Chase' }).querySelector('[aria-hidden="true"]');
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

  it('GIVEN a selected light clip WHEN Delete is pressed THEN it is removed and the selection cleared', () => {
    const { onSelect, lastChange } = renderTimeline({ kind: 'light', id: 'clip-1' });

    fireEvent.keyDown(window, { key: 'Delete' });

    expect(lastChange()?.lightTracks[0]?.clips).toEqual([]);
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('GIVEN a selected light clip WHEN Delete is typed in a text field THEN the clip stays', () => {
    const { onChange } = renderTimeline({ kind: 'light', id: 'clip-1' });
    const field = document.createElement('input');
    document.body.append(field);

    fireEvent.keyDown(field, { key: 'Delete' });

    expect(onChange).not.toHaveBeenCalled();
    field.remove();
  });

  it('GIVEN a selected audio clip WHEN Delete is pressed THEN nothing is removed', () => {
    const { onChange } = renderTimeline({ kind: 'audio', id: 'audio-1' });

    fireEvent.keyDown(window, { key: 'Delete' });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('GIVEN a light clip WHEN dragged over another light track THEN it moves there and keeps its timing', () => {
    const { container, lastChange } = renderTimeline();
    const backLane = container.querySelector('[data-track-id="track-2"]');
    if (!backLane) throw new Error('lane missing');
    // jsdom has no layout; pretend the pointer is over the second track.
    document.elementsFromPoint = () => [backLane];
    const clip = screen.getByRole('button', { name: 'Chase' });

    fireEvent.pointerDown(clip, { clientX: 0, clientY: 0 });
    fireEvent.pointerMove(clip, { clientX: 0, clientY: 60 });

    expect(lastChange()?.lightTracks.map(track => track.clips.map(c => [c.id, c.startMs]))).toEqual([
      [],
      [['clip-1', 1000]],
    ]);
    Reflect.deleteProperty(document, 'elementsFromPoint');
  });

  it('GIVEN a cue WHEN pressed THEN it is selected and the show jumps to it', () => {
    const { onSelect, onSeek } = renderTimeline();

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Chorus' }), { clientX: 0 });

    expect(onSelect).toHaveBeenCalledWith({ kind: 'cue', id: 'cue-1' });
    expect(onSeek).toHaveBeenCalledExactlyOnceWith(3000);
  });

  it('GIVEN a cue WHEN dragged near a beat THEN it snaps onto the beat', () => {
    const { lastChange } = renderTimeline();
    const cue = screen.getByRole('button', { name: 'Chorus' });

    fireEvent.pointerDown(cue, { clientX: 0 });
    // 95 px at 100 px/s: 3950 ms snaps to the beat at 4000 ms.
    fireEvent.pointerMove(window, { clientX: 95 });

    expect(lastChange()?.cues).toEqual([{ id: 'cue-1', name: 'Chorus', ms: 4000 }]);
  });

  it('GIVEN a selected cue WHEN Delete is pressed THEN it is removed', () => {
    const { lastChange } = renderTimeline({ kind: 'cue', id: 'cue-1' });

    fireEvent.keyDown(window, { key: 'Delete' });

    expect(lastChange()?.cues).toEqual([]);
    expect(lastChange()?.lightTracks[0]?.clips).toHaveLength(1);
  });

  it('GIVEN the marker WHEN dragged along the ruler and back THEN it follows and seeks once on release', () => {
    const { onSeek } = renderTimeline();
    const ruler = screen.getByLabelText('Timeline');
    const marker = screen.getByTestId('show-playhead');

    fireEvent.pointerDown(ruler, { clientX: 300 });
    fireEvent.pointerMove(window, { clientX: 500 });
    expect(marker).toHaveStyle({ left: '500px' });
    fireEvent.pointerMove(window, { clientX: 200 });
    expect(marker).toHaveStyle({ left: '200px' });
    expect(onSeek).not.toHaveBeenCalled();
    fireEvent.pointerUp(window);

    // 200 px at 100 px/s.
    expect(onSeek).toHaveBeenCalledExactlyOnceWith(2000);
    expect(marker).toHaveStyle({ left: '0px' });
  });
});
