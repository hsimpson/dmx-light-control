'use client';

import { getDmxWebsocketClient } from '@/lib/dmx/dmx-socket-connector';
import { useDmxStore } from '@/lib/dmx/dmx-store';
import { useState } from 'react';
import { controlFontStyle } from '../virtual-console-fonts';
import classes from './button-control.module.css';
import type { VirtualConsoleControlProperties } from './virtual-console-control-properties';

const ButtonControl = ({ control, mode, selected = false, onPlayValue }: VirtualConsoleControlProperties) => {
  const [pressed, setPressed] = useState(false);
  const [latched, setLatched] = useState(false);
  const functionRunning = useDmxStore(state =>
    control.functionPublicId ? state.runningFunctionIds.includes(control.functionPublicId) : false,
  );
  const play = mode === 'play';
  const upperLimit = control.upperLimit ?? 255;
  const buttonMode = control.buttonMode ?? 'flash';
  const functionPublicId = control.functionPublicId;
  const active = play && (functionPublicId ? functionRunning : buttonMode === 'toggle' ? latched : pressed);

  return (
    <button
      className={`${classes.button}${play ? ` ${classes.play}` : ''}${selected ? ` ${classes.selected}` : ''}`}
      data-pressed={active ? 'true' : undefined}
      data-testid="virtual-console-button"
      style={{
        backgroundColor: control.backgroundColor,
        color: control.foregroundColor,
        ...controlFontStyle(control),
      }}
      type="button"
      disabled={mode === 'edit'}
      onPointerCancel={() => {
        if (!play || buttonMode === 'toggle') {
          setPressed(false);
          return;
        }
        setPressed(false);
        if (functionPublicId) {
          getDmxWebsocketClient()?.stopFunction(functionPublicId);
          return;
        }
        onPlayValue?.(0);
      }}
      onPointerDown={event => {
        if (!play) {
          return;
        }
        if (typeof event.currentTarget.setPointerCapture === 'function') {
          event.currentTarget.setPointerCapture(event.pointerId);
        }
        if (functionPublicId) {
          const client = getDmxWebsocketClient();
          if (buttonMode === 'toggle') {
            if (functionRunning) {
              client?.stopFunction(functionPublicId);
            } else {
              client?.startFunction(functionPublicId);
            }
          } else {
            setPressed(true);
            client?.startFunction(functionPublicId);
          }
          return;
        }
        if (buttonMode === 'toggle') {
          const next = !latched;
          setLatched(next);
          onPlayValue?.(next ? upperLimit : 0);
          return;
        }
        setPressed(true);
        onPlayValue?.(upperLimit);
      }}
      onPointerUp={() => {
        if (!play || buttonMode === 'toggle') {
          setPressed(false);
          return;
        }
        setPressed(false);
        if (functionPublicId) {
          getDmxWebsocketClient()?.stopFunction(functionPublicId);
          return;
        }
        onPlayValue?.(0);
      }}
    >
      {control.label}
    </button>
  );
};

export default ButtonControl;
