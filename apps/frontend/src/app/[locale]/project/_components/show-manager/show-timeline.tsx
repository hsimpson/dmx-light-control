'use client';

import { useTranslation } from '@/lib/i18n/use-translation';
import { useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import {
  moveAudioClip,
  SHOW_MIN_CLIP_MS,
  showBeatsMs,
  showDurationMs,
  snapToBeat,
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

export type ShowSelection = { kind: 'light' | 'audio'; id: string } | null;

type Drag = { kind: 'move' | 'resize' | 'audio'; id: string; originX: number; startMs: number; durationMs: number };

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
}: ShowTimelineProperties) => {
  const { t } = useTranslation();
  const dragRef = useRef<Drag | null>(null);
  const beatsMs = showBeatsMs(show);
  const isSelected = (kind: 'light' | 'audio', id: string) => selection?.kind === kind && selection.id === id;
  const toPx = (ms: number) => (ms / MS_PER_SECOND) * pixelsPerSecond;
  const toMs = (px: number) => (px / pixelsPerSecond) * MS_PER_SECOND;
  const snapMs = (ms: number, grid: readonly number[] = beatsMs) => snapToBeat(ms, grid, toMs(SNAP_PX));
  const widthPx = toPx(showDurationMs(show) + TAIL_MS);
  const tickStepS = TICK_STEPS_S.find(step => step * pixelsPerSecond >= MIN_TICK_SPACING_PX) ?? 300;
  const ticks = Array.from({ length: Math.ceil(widthPx / (tickStepS * pixelsPerSecond)) }, (_, i) => i * tickStepS);

  const startDrag = (drag: Omit<Drag, 'originX'>, event: PointerEvent<HTMLElement>) => {
    event.stopPropagation();
    // jsdom (tests) has no pointer capture.
    if (typeof event.currentTarget.setPointerCapture === 'function') {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    dragRef.current = { ...drag, originX: event.clientX };
  };

  const dragTo = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const deltaMs = toMs(event.clientX - drag.originX);
    if (drag.kind === 'audio') {
      // Its own beats move with it; snapping to them would hold it in place.
      const others = showBeatsMs({ ...show, audioClips: show.audioClips.filter(clip => clip.publicId !== drag.id) });
      onChange(moveAudioClip(show, drag.id, snapMs(drag.startMs + deltaMs, others)));
    } else if (drag.kind === 'move') {
      onChange(updateLightClip(show, drag.id, { startMs: Math.max(0, Math.round(snapMs(drag.startMs + deltaMs))) }));
    } else {
      const endMs = snapMs(drag.startMs + drag.durationMs + deltaMs);
      onChange(
        updateLightClip(show, drag.id, { durationMs: Math.round(Math.max(SHOW_MIN_CLIP_MS, endMs - drag.startMs)) }),
      );
    }
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  // Ends the drag however the pointer leaves: release, cancel (touch scroll) or lost capture.
  const dragHandlers = {
    onPointerMove: dragTo,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onLostPointerCapture: endDrag,
  };

  const onActivate = (activate: () => void) => (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    activate();
  };

  const seek = (event: PointerEvent<HTMLDivElement>) => {
    onSeek(Math.max(0, Math.round(toMs(event.clientX - event.currentTarget.getBoundingClientRect().left))));
  };

  const clipBox = (startMs: number, durationMs: number): CSSProperties => ({
    left: toPx(startMs),
    width: Math.max(4, toPx(durationMs)),
  });

  return (
    <div className={classes.scroll}>
      <div className={classes.content} style={{ width: LABEL_WIDTH_PX + widthPx }}>
        <div className={`${classes.row} ${classes.rulerRow}`}>
          <div className={classes.label} />
          <div
            className={`${classes.lane} ${classes.ruler}`}
            aria-label={t({ id: 'ShowManager.timeline', defaultMessage: 'Timeline' })}
            onPointerDown={seek}
          >
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
                {...dragHandlers}
              >
                <Waveform clip={clip} />
                {clip.fileName}
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
            <div className={classes.lane}>
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
                  {...dragHandlers}
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
                    {...dragHandlers}
                    onPointerMove={event => {
                      // The clip around it would run the same move again.
                      event.stopPropagation();
                      dragTo(event);
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
          <div className={classes.playhead} style={{ left: toPx(playheadMs) }} data-testid="show-playhead" />
        </div>
      </div>
    </div>
  );
};

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
