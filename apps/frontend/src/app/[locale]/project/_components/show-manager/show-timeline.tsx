'use client';

import { useTranslation } from '@/lib/i18n/use-translation';
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import {
  moveAudioClip,
  moveLightClipToTrack,
  removeCue,
  removeLightClip,
  SHOW_MIN_CLIP_MS,
  showBeatsMs,
  showDurationMs,
  snapToBeat,
  updateCue,
  updateLightClip,
  type ShowAudioClip,
  type ShowDocument,
} from './show-document';
import classes from './show-timeline.module.css';

/** Same as the label column in show-timeline.module.css. */
const LABEL_WIDTH_PX = 140;
/** Clip edges lock onto a beat this close on screen, whatever the zoom. */
const SNAP_PX = 8;
const MIN_TICK_SPACING_PX = 60;
const TICK_STEPS_S = [1, 2, 5, 10, 15, 30, 60, 120, 300];
/** Room after the last clip to drag clips further out. */
const TAIL_MS = 30_000;
const MS_PER_SECOND = 1000;
/** One mouse-wheel notch (about 100 px) zooms by about a fifth. */
const WHEEL_ZOOM_PER_PX = 0.002;
const WHEEL_LINE_PX = 16;

type SelectionKind = 'light' | 'audio' | 'cue';

export type ShowSelection = { kind: SelectionKind; id: string } | null;

type Drag = {
  kind: 'move' | 'resize' | 'audio' | 'scrub' | 'cue';
  id: string;
  originX: number;
  startMs: number;
  durationMs: number;
};

type ShowTimelineProperties = {
  show: ShowDocument;
  functionNames: ReadonlyMap<string, string>;
  pixelsPerSecond: number;
  playheadMs: number;
  selection: ShowSelection;
  selectedTrackId: string | null;
  onSelect: (selection: ShowSelection) => void;
  onSelectTrack: (trackId: string) => void;
  onChange: (show: ShowDocument) => void;
  onSeek: (ms: number) => void;
  onZoom: (factor: number) => void;
};

const ShowTimeline = ({
  show,
  functionNames,
  pixelsPerSecond,
  playheadMs,
  selection,
  selectedTrackId,
  onSelect,
  onSelectTrack,
  onChange,
  onSeek,
  onZoom,
}: ShowTimelineProperties) => {
  const { t } = useTranslation();
  const dragRef = useRef<Drag | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // The time under the cursor when the wheel zoomed, kept under it once the new zoom is laid out.
  const zoomAnchorRef = useRef<{ ms: number; offsetPx: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  // The marker while it is dragged; the seek itself waits for release, so a playing show jumps once.
  const [scrubMs, setScrubMs] = useState<number | null>(null);
  const markerMs = scrubMs ?? playheadMs;
  const beatsMs = showBeatsMs(show);
  const isSelected = (kind: SelectionKind, id: string) => selection?.kind === kind && selection.id === id;
  const toPx = (ms: number) => (ms / MS_PER_SECOND) * pixelsPerSecond;
  const toMs = (px: number) => (px / pixelsPerSecond) * MS_PER_SECOND;
  const snapMs = (ms: number, grid: readonly number[] = beatsMs) => snapToBeat(ms, grid, toMs(SNAP_PX));
  const widthPx = toPx(showDurationMs(show) + TAIL_MS);
  const tickStepS = TICK_STEPS_S.find(step => step * pixelsPerSecond >= MIN_TICK_SPACING_PX) ?? 300;
  const ticks = Array.from({ length: Math.ceil(widthPx / (tickStepS * pixelsPerSecond)) }, (_, i) => i * tickStepS);

  const startDrag = (drag: Omit<Drag, 'originX'>, event: PointerEvent<HTMLElement>) => {
    event.stopPropagation();
    dragRef.current = { ...drag, originX: event.clientX };
    setDragging(true);
  };

  const moveClip = (drag: Drag, deltaMs: number, clientX: number, clientY: number) => {
    const startMs = Math.max(0, Math.round(snapMs(drag.startMs + deltaMs)));
    const moved = updateLightClip(show, drag.id, { startMs });
    const trackId = lightTrackAt(clientX, clientY);
    onChange(trackId ? moveLightClipToTrack(moved, drag.id, trackId) : moved);
    if (trackId) onSelectTrack(trackId);
  };

  const dragTo = (clientX: number, clientY: number) => {
    const drag = dragRef.current;
    if (!drag) return;
    const deltaMs = toMs(clientX - drag.originX);
    if (drag.kind === 'scrub') {
      setScrubMs(Math.max(0, Math.round(drag.startMs + deltaMs)));
    } else if (drag.kind === 'cue') {
      onChange(updateCue(show, drag.id, { ms: Math.max(0, Math.round(snapMs(drag.startMs + deltaMs))) }));
    } else if (drag.kind === 'audio') {
      // Its own beats move with it; snapping to them would hold it in place.
      const others = showBeatsMs({ ...show, audioClips: show.audioClips.filter(clip => clip.publicId !== drag.id) });
      onChange(moveAudioClip(show, drag.id, snapMs(drag.startMs + deltaMs, others)));
    } else if (drag.kind === 'move') {
      moveClip(drag, deltaMs, clientX, clientY);
    } else {
      const endMs = snapMs(drag.startMs + drag.durationMs + deltaMs);
      onChange(
        updateLightClip(show, drag.id, { durationMs: Math.round(Math.max(SHOW_MIN_CLIP_MS, endMs - drag.startMs)) }),
      );
    }
  };

  const onDragEnd = useEffectEvent(() => {
    if (dragRef.current?.kind === 'scrub' && scrubMs !== null) onSeek(scrubMs);
    dragRef.current = null;
    setDragging(false);
    setScrubMs(null);
  });

  // Followed on the window: a clip dragged onto another track is a new element, so its own pointer events stop.
  const onWindowPointerMove = useEffectEvent((event: globalThis.PointerEvent) => {
    dragTo(event.clientX, event.clientY);
  });
  useEffect(() => {
    if (!dragging) return;
    const move = (event: globalThis.PointerEvent) => {
      onWindowPointerMove(event);
    };
    const end = () => {
      onDragEnd();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, [dragging]);

  const onWindowKeyDown = useEffectEvent((event: globalThis.KeyboardEvent) => {
    if (selection === null || selection.kind === 'audio') return;
    if ((event.key !== 'Delete' && event.key !== 'Backspace') || isTextEntry(event.target)) return;
    event.preventDefault();
    onChange(selection.kind === 'cue' ? removeCue(show, selection.id) : removeLightClip(show, selection.id));
    onSelect(null);
  });
  useEffect(() => {
    const keyDown = (event: globalThis.KeyboardEvent) => {
      onWindowKeyDown(event);
    };
    window.addEventListener('keydown', keyDown);
    return () => {
      window.removeEventListener('keydown', keyDown);
    };
  }, []);

  const onWheel = useEffectEvent((event: WheelEvent) => {
    const scroll = scrollRef.current;
    // Shift and sideways swipes keep scrolling the timeline.
    if (!scroll || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    event.preventDefault();
    const offsetPx = event.clientX - scroll.getBoundingClientRect().left;
    zoomAnchorRef.current = { ms: toMs(scroll.scrollLeft + offsetPx - LABEL_WIDTH_PX), offsetPx };
    const deltaPx = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? event.deltaY * WHEEL_LINE_PX : event.deltaY;
    onZoom(Math.exp(-deltaPx * WHEEL_ZOOM_PER_PX));
  });
  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    const wheel = (event: WheelEvent) => {
      onWheel(event);
    };
    // Not passive, so the page does not scroll while the timeline zooms.
    scroll.addEventListener('wheel', wheel, { passive: false });
    return () => {
      scroll.removeEventListener('wheel', wheel);
    };
  }, []);
  useLayoutEffect(() => {
    const anchor = zoomAnchorRef.current;
    const scroll = scrollRef.current;
    if (!anchor || !scroll) return;
    scroll.scrollLeft = LABEL_WIDTH_PX + (anchor.ms / MS_PER_SECOND) * pixelsPerSecond - anchor.offsetPx;
    zoomAnchorRef.current = null;
  }, [pixelsPerSecond]);

  const onActivate = (activate: () => void) => (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    activate();
  };

  /** Pressing on the ruler puts the marker there; dragging moves it on. */
  const startScrub = (event: PointerEvent<HTMLDivElement>) => {
    const ms = Math.max(0, Math.round(toMs(event.clientX - event.currentTarget.getBoundingClientRect().left)));
    setScrubMs(ms);
    startDrag({ kind: 'scrub', id: '', startMs: ms, durationMs: 0 }, event);
  };

  const clipBox = (startMs: number, durationMs: number): CSSProperties => ({
    left: toPx(startMs),
    width: Math.max(4, toPx(durationMs)),
  });

  return (
    <div ref={scrollRef} className={classes.scroll}>
      <div className={classes.content} style={{ width: LABEL_WIDTH_PX + widthPx }}>
        <div className={`${classes.row} ${classes.rulerRow}`}>
          <div className={classes.label} />
          <div
            className={`${classes.lane} ${classes.ruler}`}
            aria-label={t({ id: 'ShowManager.timeline', defaultMessage: 'Timeline' })}
            onPointerDown={startScrub}
          >
            <div className={classes.playheadGrip} style={{ left: toPx(markerMs) }} aria-hidden />
            {ticks.map(seconds => (
              <span key={seconds} className={classes.tick} style={{ left: seconds * pixelsPerSecond }}>
                {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
              </span>
            ))}
          </div>
        </div>
        <div className={classes.row}>
          <div className={classes.label}>{t({ id: 'ShowManager.audioTrack', defaultMessage: 'Audio' })}</div>
          <div className={classes.lane}>
            {show.audioClips.map(clip => (
              <div
                key={clip.publicId}
                role="button"
                tabIndex={0}
                aria-label={clip.fileName}
                aria-pressed={isSelected('audio', clip.publicId)}
                className={`${classes.clip} ${classes.audioClip} ${isSelected('audio', clip.publicId) ? classes.clipSelected : ''}`}
                style={clipBox(clip.startMs, clip.durationMs)}
                onPointerDown={event => {
                  onSelect({ kind: 'audio', id: clip.publicId });
                  startDrag(
                    { kind: 'audio', id: clip.publicId, startMs: clip.startMs, durationMs: clip.durationMs },
                    event,
                  );
                }}
                onKeyDown={onActivate(() => {
                  onSelect({ kind: 'audio', id: clip.publicId });
                })}
              >
                <Waveform clip={clip} />
                {clip.fileName}
              </div>
            ))}
            {show.cues.map(cue => (
              <div
                key={cue.id}
                role="button"
                tabIndex={0}
                aria-label={cue.name}
                aria-pressed={isSelected('cue', cue.id)}
                className={`${classes.cue} ${isSelected('cue', cue.id) ? classes.cueSelected : ''}`}
                style={{ left: toPx(cue.ms) }}
                data-testid="show-cue"
                onPointerDown={event => {
                  onSelect({ kind: 'cue', id: cue.id });
                  onSeek(cue.ms);
                  startDrag({ kind: 'cue', id: cue.id, startMs: cue.ms, durationMs: 0 }, event);
                }}
                onKeyDown={onActivate(() => {
                  onSelect({ kind: 'cue', id: cue.id });
                  onSeek(cue.ms);
                })}
              >
                {cue.name}
              </div>
            ))}
          </div>
        </div>
        {show.lightTracks.map(track => (
          <div key={track.id} className={classes.row}>
            <div
              role="button"
              tabIndex={0}
              className={`${classes.label} ${track.id === selectedTrackId ? classes.labelSelected : ''}`}
              aria-pressed={track.id === selectedTrackId}
              onClick={() => {
                onSelectTrack(track.id);
              }}
              onKeyDown={onActivate(() => {
                onSelectTrack(track.id);
              })}
            >
              {track.name}
            </div>
            <div className={classes.lane} data-track-id={track.id}>
              {track.clips.map(clip => (
                <div
                  key={clip.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected('light', clip.id)}
                  aria-label={functionNames.get(clip.functionPublicId) ?? clip.functionPublicId}
                  className={`${classes.clip} ${isSelected('light', clip.id) ? classes.clipSelected : ''}`}
                  style={clipBox(clip.startMs, clip.durationMs)}
                  onPointerDown={event => {
                    onSelectTrack(track.id);
                    onSelect({ kind: 'light', id: clip.id });
                    startDrag({ kind: 'move', id: clip.id, startMs: clip.startMs, durationMs: clip.durationMs }, event);
                  }}
                  onKeyDown={onActivate(() => {
                    onSelectTrack(track.id);
                    onSelect({ kind: 'light', id: clip.id });
                  })}
                >
                  {functionNames.get(clip.functionPublicId) ?? '?'}
                  <div
                    className={classes.resize}
                    aria-hidden
                    onPointerDown={event => {
                      onSelect({ kind: 'light', id: clip.id });
                      startDrag(
                        { kind: 'resize', id: clip.id, startMs: clip.startMs, durationMs: clip.durationMs },
                        event,
                      );
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className={classes.overlay} style={{ left: LABEL_WIDTH_PX, width: widthPx }} aria-hidden>
          {[...new Set(beatsMs)].map(beat => (
            <div key={beat} className={classes.beat} style={{ left: toPx(beat) }} data-testid="show-beat" />
          ))}
          {show.cues.map(cue => (
            <div key={cue.id} className={classes.cueLine} style={{ left: toPx(cue.ms) }} />
          ))}
          <div className={classes.playhead} style={{ left: toPx(markerMs) }} data-testid="show-playhead" />
        </div>
      </div>
    </div>
  );
};

/** The light track lane under a screen point, if any; jsdom has no hit testing. */
function lightTrackAt(clientX: number, clientY: number): string | undefined {
  if (typeof document.elementsFromPoint !== 'function') return undefined;
  const lane = document
    .elementsFromPoint(clientX, clientY)
    .map(element => element.closest<HTMLElement>('[data-track-id]'))
    .find(element => element !== null);
  return lane?.dataset.trackId;
}

// Delete in a text field edits the text, not the timeline.
function isTextEntry(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

/** Mirrored peak envelope; one SVG unit per peak, stretched to the clip. */
const Waveform = ({ clip }: { clip: ShowAudioClip }) => {
  const top = clip.peaks.map((peak, index) => `${index},${0.5 - peak / 2}`);
  const bottom = clip.peaks.map((peak, index) => `${index},${0.5 + peak / 2}`).reverse();
  return (
    <svg className={classes.waveform} viewBox={`0 0 ${Math.max(1, clip.peaks.length)} 1`} preserveAspectRatio="none">
      <polygon points={[...top, ...bottom].join(' ')} />
    </svg>
  );
};

export default ShowTimeline;
