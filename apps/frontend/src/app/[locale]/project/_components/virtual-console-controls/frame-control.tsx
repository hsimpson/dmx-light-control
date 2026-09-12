'use client';

import type { VirtualConsoleControlProperties } from './virtual-console-control-properties';
import classes from './frame-control.module.css';

const FrameControl = ({
  control,
  selected = false,
  dropTarget = false,
  liftOverflow = false,
  children,
}: VirtualConsoleControlProperties) => {
  return (
    <div
      className={`${classes.frame}${selected ? ` ${classes.selected}` : ''}${dropTarget ? ` ${classes.dropTarget}` : ''}${liftOverflow ? ` ${classes.liftOverflow}` : ''}`}
      data-drop-target={dropTarget ? 'true' : undefined}
      data-testid="virtual-console-frame"
      style={{
        backgroundColor: control.backgroundColor,
        border: `${control.borderWidth ?? 0}px solid ${control.borderColor ?? '#000000'}`,
      }}
    >
      <div className={classes.header}>{control.label}</div>
      <div className={classes.body}>{children}</div>
    </div>
  );
};

export default FrameControl;
