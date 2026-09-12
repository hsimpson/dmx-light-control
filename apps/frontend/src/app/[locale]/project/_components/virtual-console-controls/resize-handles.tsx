'use client';

import { useTranslation } from '@/lib/i18n/use-translation';
import type { PointerEvent } from 'react';
import { VIRTUAL_CONSOLE_RESIZE_HANDLES, type VirtualConsoleResizeHandle } from '../virtual-console-document';
import classes from './resize-handles.module.css';

type ResizeHandlesProperties = {
  onResizePointerDown: (handle: VirtualConsoleResizeHandle, event: PointerEvent<HTMLDivElement>) => void;
};

const HANDLE_LABEL_IDS: Record<VirtualConsoleResizeHandle, { id: string; defaultMessage: string }> = {
  n: { id: 'ProjectDetail.virtualConsole.resize.north', defaultMessage: 'Resize top' },
  s: { id: 'ProjectDetail.virtualConsole.resize.south', defaultMessage: 'Resize bottom' },
  e: { id: 'ProjectDetail.virtualConsole.resize.east', defaultMessage: 'Resize right' },
  w: { id: 'ProjectDetail.virtualConsole.resize.west', defaultMessage: 'Resize left' },
  ne: { id: 'ProjectDetail.virtualConsole.resize.northEast', defaultMessage: 'Resize top-right' },
  nw: { id: 'ProjectDetail.virtualConsole.resize.northWest', defaultMessage: 'Resize top-left' },
  se: { id: 'ProjectDetail.virtualConsole.resize.southEast', defaultMessage: 'Resize bottom-right' },
  sw: { id: 'ProjectDetail.virtualConsole.resize.southWest', defaultMessage: 'Resize bottom-left' },
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

const ResizeHandles = ({ onResizePointerDown }: ResizeHandlesProperties) => {
  const { t } = useTranslation();

  return (
    <>
      {VIRTUAL_CONSOLE_RESIZE_HANDLES.map(handle => (
        <div
          aria-label={t(HANDLE_LABEL_IDS[handle])}
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
