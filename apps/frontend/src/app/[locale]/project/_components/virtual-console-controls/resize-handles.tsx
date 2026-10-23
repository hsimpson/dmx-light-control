'use client';

import { useTranslation } from '@/lib/i18n/use-translation';
import type { PointerEvent } from 'react';
import { VIRTUAL_CONSOLE_RESIZE_HANDLES, type VirtualConsoleResizeHandle } from '../virtual-console-document';
import classes from './resize-handles.module.css';

type ResizeHandlesProperties = {
  onResizePointerDown: (handle: VirtualConsoleResizeHandle, event: PointerEvent<HTMLDivElement>) => void;
};

const HANDLE_CLASS: Record<VirtualConsoleResizeHandle, string> = {
  n: classes.n ?? '',
  s: classes.s ?? '',
  e: classes.e ?? '',
  w: classes.w ?? '',
  ne: classes.ne ?? '',
  nw: classes.nw ?? '',
  se: classes.se ?? '',
  sw: classes.sw ?? '',
};

const resizeLabel = (t: ReturnType<typeof useTranslation>['t'], handle: VirtualConsoleResizeHandle): string => {
  switch (handle) {
    case 'n':
      return t({ id: 'ProjectDetail.virtualConsole.resize.north', defaultMessage: 'Resize top' });
    case 's':
      return t({ id: 'ProjectDetail.virtualConsole.resize.south', defaultMessage: 'Resize bottom' });
    case 'e':
      return t({ id: 'ProjectDetail.virtualConsole.resize.east', defaultMessage: 'Resize right' });
    case 'w':
      return t({ id: 'ProjectDetail.virtualConsole.resize.west', defaultMessage: 'Resize left' });
    case 'ne':
      return t({ id: 'ProjectDetail.virtualConsole.resize.northEast', defaultMessage: 'Resize top-right' });
    case 'nw':
      return t({ id: 'ProjectDetail.virtualConsole.resize.northWest', defaultMessage: 'Resize top-left' });
    case 'se':
      return t({ id: 'ProjectDetail.virtualConsole.resize.southEast', defaultMessage: 'Resize bottom-right' });
    case 'sw':
      return t({ id: 'ProjectDetail.virtualConsole.resize.southWest', defaultMessage: 'Resize bottom-left' });
  }
};

const ResizeHandles = ({ onResizePointerDown }: ResizeHandlesProperties) => {
  const { t } = useTranslation();

  return (
    <>
      {VIRTUAL_CONSOLE_RESIZE_HANDLES.map(handle => (
        <div
          aria-label={resizeLabel(t, handle)}
          className={`${classes.handle ?? ''} ${HANDLE_CLASS[handle]}`}
          data-testid={`virtual-console-resize-${handle}`}
          key={handle}
          role="button"
          tabIndex={-1}
          onPointerDown={event => {
            event.preventDefault();
            event.stopPropagation();
            onResizePointerDown(handle, event);
          }}
        />
      ))}
    </>
  );
};

export default ResizeHandles;
