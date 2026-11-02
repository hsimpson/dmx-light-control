'use client';

import { useDmxStore } from '@/lib/dmx/dmx-store';
import { controlFontStyle } from '../virtual-console-fonts';
import classes from './button-control.module.css';
import type { VirtualConsoleControlProperties } from './virtual-console-control-properties';

/** Sends press (1) and release (0); flash/toggle and function start/stop run on the backend. */
const ButtonControl = ({ control, mode, selected = false, onPlayValue }: VirtualConsoleControlProperties) => {
  const on = useDmxStore(state =>
    control.functionPublicId
      ? state.runningFunctionIds.includes(control.functionPublicId)
      : (state.controlValues[control.id] ?? 0) > 0,
  );
  const play = mode === 'play';
  const release = () => {
    if (play) {
      onPlayValue?.(0);
    }
  };

  return (
    <button
      className={`${classes.button}${play ? ` ${classes.play}` : ''}${selected ? ` ${classes.selected}` : ''}`}
      data-pressed={play && on ? 'true' : undefined}
      data-testid="virtual-console-button"
      style={{
        backgroundColor: control.backgroundColor,
        color: control.foregroundColor,
        ...controlFontStyle(control),
      }}
      type="button"
      disabled={mode === 'edit'}
      onPointerCancel={release}
      onPointerDown={event => {
        if (!play) {
          return;
        }
        if (typeof event.currentTarget.setPointerCapture === 'function') {
          event.currentTarget.setPointerCapture(event.pointerId);
        }
        onPlayValue?.(1);
      }}
      onPointerUp={release}
    >
      {control.label}
    </button>
  );
};

export default ButtonControl;
