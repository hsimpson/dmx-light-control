'use client';

import type { VirtualConsoleControlProperties } from './virtual-console-control-properties';
import classes from './button-control.module.css';

const ButtonControl = ({ control, mode, selected = false }: VirtualConsoleControlProperties) => {
  return (
    <button
      className={`${classes.button}${mode === 'play' ? ` ${classes.play}` : ''}${selected ? ` ${classes.selected}` : ''}`}
      data-testid="virtual-console-button"
      style={{ backgroundColor: control.backgroundColor, color: control.foregroundColor }}
      type="button"
      disabled={mode === 'edit'}
    >
      {control.label}
    </button>
  );
};

export default ButtonControl;
