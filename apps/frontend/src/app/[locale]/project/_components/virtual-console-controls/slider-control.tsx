'use client';

import { useState } from 'react';
import type { VirtualConsoleControlProperties } from './virtual-console-control-properties';
import classes from './slider-control.module.css';

const SliderControl = ({ control, mode, selected = false }: VirtualConsoleControlProperties) => {
  const orientation = control.orientation ?? 'vertical';
  const max = control.valueType === 'percentage' ? 100 : 255;
  const [value, setValue] = useState(0);
  const ratio = value / max;
  const isVertical = orientation === 'vertical';

  return (
    <div
      className={`${classes.slider} ${isVertical ? classes.vertical : classes.horizontal}${selected ? ` ${classes.selected}` : ''}`}
      data-testid="virtual-console-slider"
      style={{ backgroundColor: control.backgroundColor }}
    >
      <div className={classes.track} style={{ backgroundColor: control.backgroundColor }}>
        <div
          className={classes.thumb}
          style={
            isVertical
              ? {
                  backgroundColor: control.foregroundColor,
                  bottom: `calc(${ratio * 100}% - 6px)`,
                  height: 12,
                  left: 0,
                  right: 0,
                }
              : {
                  backgroundColor: control.foregroundColor,
                  left: `calc(${ratio * 100}% - 6px)`,
                  top: 0,
                  bottom: 0,
                  width: 12,
                }
          }
        />
      </div>
      {mode === 'play' ? (
        <input
          aria-label={control.label}
          className={classes.range}
          max={max}
          min={0}
          onChange={event => {
            setValue(Number(event.target.value));
          }}
          type="range"
          value={value}
        />
      ) : null}
    </div>
  );
};

export default SliderControl;
