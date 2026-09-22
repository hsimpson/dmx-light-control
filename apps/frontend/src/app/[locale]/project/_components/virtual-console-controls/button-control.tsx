'use client';

import { useState } from 'react';
import { controlFontStyle } from '../virtual-console-fonts';
import classes from './button-control.module.css';
import type { VirtualConsoleControlProperties } from './virtual-console-control-properties';

const ButtonControl = ({ control, mode, selected = false, onPlayValue }: VirtualConsoleControlProperties) => {
  const [pressed, setPressed] = useState(false);
  const play = mode === 'play';

  return (
    <button
      className={`${classes.button}${play ? ` ${classes.play}` : ''}${selected ? ` ${classes.selected}` : ''}`}
      data-pressed={play && pressed ? 'true' : undefined}
      data-testid="virtual-console-button"
      style={{
        backgroundColor: control.backgroundColor,
        color: control.foregroundColor,
        ...controlFontStyle(control),
      }}
      type="button"
      disabled={mode === 'edit'}
      onPointerCancel={() => {
        setPressed(false);
        if (play) {
          onPlayValue?.(0);
        }
      }}
      onPointerDown={event => {
        if (!play) {
          return;
        }
        if (typeof event.currentTarget.setPointerCapture === 'function') {
          event.currentTarget.setPointerCapture(event.pointerId);
        }
        setPressed(true);
        onPlayValue?.(255);
      }}
      onPointerUp={() => {
        setPressed(false);
        if (play) {
          onPlayValue?.(0);
        }
      }}
    >
      {control.label}
    </button>
  );
};

export default ButtonControl;
