'use client';

import ButtonControl from '@/app/[locale]/project/_components/virtual-console-controls/button-control';
import FrameControl from '@/app/[locale]/project/_components/virtual-console-controls/frame-control';
import ResizeHandles from '@/app/[locale]/project/_components/virtual-console-controls/resize-handles';
import SliderControl from '@/app/[locale]/project/_components/virtual-console-controls/slider-control';
import type { VirtualConsoleControlMode } from '@/app/[locale]/project/_components/virtual-console-controls/virtual-console-control-properties';
import type {
  VirtualConsoleControl,
  VirtualConsoleResizeHandle,
} from '@/app/[locale]/project/_components/virtual-console-document';
import type { PointerEvent } from 'react';

type VirtualConsoleControlTreeProperties = {
  controls: VirtualConsoleControl[];
  mode: VirtualConsoleControlMode;
  selectedControlId: string | null;
  onSelectControl: (id: string) => void;
  onMovePointerDown: (controlId: string, event: PointerEvent<HTMLDivElement>) => void;
  onResizePointerDown: (
    controlId: string,
    handle: VirtualConsoleResizeHandle,
    event: PointerEvent<HTMLDivElement>,
  ) => void;
};

const VirtualConsoleControlTree = ({
  controls,
  mode,
  selectedControlId,
  onSelectControl,
  onMovePointerDown,
  onResizePointerDown,
}: VirtualConsoleControlTreeProperties) => {
  return (
    <>
      {controls.map(control => {
        const selected = selectedControlId === control.id;
        return (
          <div
            key={control.id}
            data-testid={`virtual-console-control-${control.id}`}
            style={{
              height: control.height,
              left: control.x,
              overflow: 'visible',
              position: 'absolute',
              top: control.y,
              width: control.width,
              zIndex: selected ? 1 : undefined,
            }}
            onClick={event => {
              event.stopPropagation();
              if (mode === 'edit') {
                onSelectControl(control.id);
              }
            }}
            onPointerDown={event => {
              if (mode === 'edit') {
                onMovePointerDown(control.id, event);
              }
            }}
          >
            {control.type === 'frame' ? (
              <FrameControl control={control} mode={mode} selected={selected}>
                <VirtualConsoleControlTree
                  controls={control.children ?? []}
                  mode={mode}
                  selectedControlId={selectedControlId}
                  onSelectControl={onSelectControl}
                  onMovePointerDown={onMovePointerDown}
                  onResizePointerDown={onResizePointerDown}
                />
              </FrameControl>
            ) : null}
            {control.type === 'slider' ? <SliderControl control={control} mode={mode} selected={selected} /> : null}
            {control.type === 'button' ? <ButtonControl control={control} mode={mode} selected={selected} /> : null}
            {mode === 'edit' && selected ? (
              <ResizeHandles
                onResizePointerDown={(handle, event) => {
                  onSelectControl(control.id);
                  onResizePointerDown(control.id, handle, event);
                }}
              />
            ) : null}
          </div>
        );
      })}
    </>
  );
};

export default VirtualConsoleControlTree;
