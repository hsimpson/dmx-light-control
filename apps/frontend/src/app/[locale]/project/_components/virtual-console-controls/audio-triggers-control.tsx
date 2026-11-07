'use client';

import { useDmxStore } from '@/lib/dmx/dmx-store';
import { useTranslation } from '@/lib/i18n/use-translation';
import { controlFontStyle } from '../virtual-console-fonts';
import classes from './audio-triggers-control.module.css';
import type { VirtualConsoleControlProperties } from './virtual-console-control-properties';

const NO_LEVELS: number[] = [];

/** Toggle plus live bars (volume, then bands); the backend does the analysis and drives the lights. */
const AudioTriggersControl = ({ control, mode, selected = false, onPlayValue }: VirtualConsoleControlProperties) => {
  const { t } = useTranslation();
  const on = useDmxStore(state => (state.controlValues[control.id] ?? 0) > 0);
  const levels = useDmxStore(state => state.audioLevels[control.id] ?? NO_LEVELS);
  const play = mode === 'play';
  // The backend sends the saved bars, then the beat pulse; read it from the end, as a draft's band count can differ.
  const barLevels = levels.slice(0, -1);
  const beatPercent = Math.round((on ? (levels.at(-1) ?? 0) : 0) * 100);
  const send = (value: number) => {
    if (play) onPlayValue?.(value);
  };

  return (
    <div
      className={`${classes.root}${selected ? ` ${classes.selected}` : ''}`}
      data-testid="virtual-console-audio-triggers"
      style={{ backgroundColor: control.backgroundColor, color: control.foregroundColor, ...controlFontStyle(control) }}
    >
      <button
        className={classes.toggle}
        data-on={on ? 'true' : undefined}
        data-play={play ? 'true' : undefined}
        aria-pressed={on}
        disabled={!play}
        type="button"
        onPointerDown={event => {
          // Capture, so a release outside the toggle still sends 0 and the next press is a rising edge again.
          if (play && typeof event.currentTarget.setPointerCapture === 'function') {
            event.currentTarget.setPointerCapture(event.pointerId);
          }
          send(1);
        }}
        onPointerUp={() => {
          send(0);
        }}
        onPointerCancel={() => {
          send(0);
        }}
      >
        <span>{control.label}</span>
      </button>
      <div className={classes.bars}>
        {(control.audioBars ?? []).map((bar, index) => {
          const name =
            index === 0
              ? t({ id: 'ProjectDetail.virtualConsole.audio.volume', defaultMessage: 'Volume' })
              : t(
                  { id: 'ProjectDetail.virtualConsole.audio.band', defaultMessage: 'Band {number}' },
                  { number: index },
                );
          const percent = Math.round((on ? (barLevels[index] ?? 0) : 0) * 100);
          return (
            <div key={name} className={classes.bar}>
              <div
                className={`${classes.track}${bar.mode === 'none' ? ` ${classes.idle}` : ''}`}
                role="meter"
                aria-label={t(
                  { id: 'ProjectDetail.virtualConsole.audio.levelOf', defaultMessage: '{bar} level' },
                  { bar: name },
                )}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
              >
                <div
                  className={classes.fill}
                  style={{ height: `${percent}%`, backgroundColor: control.foregroundColor }}
                />
                <div className={classes.threshold} style={{ bottom: `${bar.maxThreshold}%` }} />
                <div className={classes.threshold} style={{ bottom: `${bar.minThreshold}%` }} />
              </div>
              <span className={classes.caption} aria-hidden>
                {index === 0 ? 'V' : index}
              </span>
            </div>
          );
        })}
        <div className={classes.bar}>
          <div
            className={`${classes.track}${control.beatBar?.functionPublicId ? '' : ` ${classes.idle}`}`}
            role="meter"
            aria-label={t(
              { id: 'ProjectDetail.virtualConsole.audio.levelOf', defaultMessage: '{bar} level' },
              { bar: t({ id: 'ProjectDetail.virtualConsole.audio.beat', defaultMessage: 'Beat' }) },
            )}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={beatPercent}
          >
            <div
              className={classes.fill}
              style={{ height: `${beatPercent}%`, backgroundColor: control.foregroundColor }}
            />
          </div>
          <span className={classes.caption} aria-hidden>
            B
          </span>
        </div>
      </div>
    </div>
  );
};

export default AudioTriggersControl;
