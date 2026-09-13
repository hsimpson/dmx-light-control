'use client';

import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { controlFontStyle } from '../virtual-console-fonts';
import classes from './slider-control.module.css';
import type { VirtualConsoleControlProperties } from './virtual-console-control-properties';

const HANDLE_SIZE_PX = 24;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const valueFromPointer = (clientX: number, clientY: number, rect: DOMRect, isVertical: boolean, max: number) => {
  const ratio = isVertical
    ? 1 - (clientY - rect.top) / Math.max(rect.height, 1)
    : (clientX - rect.left) / Math.max(rect.width, 1);
  return clamp(Math.round(ratio * max), 0, max);
};

const SliderControl = ({ control, mode, selected = false }: VirtualConsoleControlProperties) => {
  const orientation = control.orientation ?? 'vertical';
  const max = control.valueType === 'percentage' ? 100 : 255;
  const [value, setValue] = useState(0);
  const ratio = value / max;
  const isVertical = orientation === 'vertical';
  const displayValue = control.valueType === 'percentage' ? `${value}%` : String(value);
  const handleSize = isVertical ? control.width / 2 : control.height / 2;
  const handleOffset = `clamp(0px, calc(${ratio} * (100% - ${HANDLE_SIZE_PX}px)), calc(100% - ${HANDLE_SIZE_PX}px))`;
  const fillColor = control.foregroundColor ?? '#4dabf7';
  const fontStyle = controlFontStyle(control);
  const railRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const applyPointer = useCallback(
    (clientX: number, clientY: number) => {
      const rail = railRef.current;
      if (!rail) {
        return;
      }
      setValue(valueFromPointer(clientX, clientY, rail.getBoundingClientRect(), isVertical, max));
    },
    [isVertical, max],
  );

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (mode !== 'play') {
      return;
    }
    event.preventDefault();
    draggingRef.current = true;
    if (typeof event.currentTarget.setPointerCapture === 'function') {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    applyPointer(event.clientX, event.clientY);

    const onWindowMove = (moveEvent: PointerEvent) => {
      applyPointer(moveEvent.clientX, moveEvent.clientY);
    };
    const onWindowUp = () => {
      draggingRef.current = false;
      window.removeEventListener('pointermove', onWindowMove);
      window.removeEventListener('pointerup', onWindowUp);
    };
    window.addEventListener('pointermove', onWindowMove);
    window.addEventListener('pointerup', onWindowUp);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) {
      return;
    }
    applyPointer(event.clientX, event.clientY);
  };

  const endPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    if (typeof event.currentTarget.releasePointerCapture === 'function') {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (mode !== 'play') {
      return;
    }
    const delta =
      event.key === 'ArrowUp' || event.key === 'ArrowRight'
        ? 1
        : event.key === 'ArrowDown' || event.key === 'ArrowLeft'
          ? -1
          : 0;
    if (delta === 0) {
      return;
    }
    event.preventDefault();
    setValue(current => clamp(current + delta, 0, max));
  };

  return (
    <div
      aria-label={mode === 'play' ? control.label : undefined}
      aria-orientation={mode === 'play' ? orientation : undefined}
      aria-valuemax={mode === 'play' ? max : undefined}
      aria-valuemin={mode === 'play' ? 0 : undefined}
      aria-valuenow={mode === 'play' ? value : undefined}
      className={`${classes.slider} ${isVertical ? classes.vertical : classes.horizontal}${mode === 'play' ? ` ${classes.play}` : ''}${selected ? ` ${classes.selected}` : ''}`}
      data-testid="virtual-console-slider"
      onKeyDown={onKeyDown}
      role={mode === 'play' ? 'slider' : undefined}
      style={{ backgroundColor: control.backgroundColor, color: fillColor, ...fontStyle }}
      tabIndex={mode === 'play' ? 0 : undefined}
    >
      {isVertical ? (
        <div className={classes.value} data-testid="virtual-console-slider-value" style={fontStyle}>
          {displayValue}
        </div>
      ) : (
        <div className={classes.label} data-testid="virtual-console-slider-label" style={fontStyle}>
          {control.label}
        </div>
      )}
      <div
        className={classes.rail}
        data-testid="virtual-console-slider-rail"
        onPointerCancel={endPointer}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        ref={railRef}
      >
        <div className={classes.groove}>
          <div
            className={classes.fill}
            data-testid="virtual-console-slider-fill"
            style={
              isVertical
                ? { backgroundColor: fillColor, height: `${ratio * 100}%` }
                : { backgroundColor: fillColor, width: `${ratio * 100}%` }
            }
          />
        </div>
        <div
          className={classes.handle}
          data-testid="virtual-console-slider-handle"
          style={
            isVertical
              ? {
                  backgroundColor: fillColor,
                  bottom: handleOffset,
                  height: HANDLE_SIZE_PX,
                  left: '50%',
                  marginLeft: -handleSize / 2,
                  width: handleSize,
                }
              : {
                  backgroundColor: fillColor,
                  height: handleSize,
                  left: handleOffset,
                  marginTop: -handleSize / 2,
                  top: '50%',
                  width: HANDLE_SIZE_PX,
                }
          }
        />
      </div>
      {isVertical ? (
        <div className={classes.label} data-testid="virtual-console-slider-label" style={fontStyle}>
          {control.label}
        </div>
      ) : (
        <div className={classes.value} data-testid="virtual-console-slider-value" style={fontStyle}>
          {displayValue}
        </div>
      )}
    </div>
  );
};

export default SliderControl;
