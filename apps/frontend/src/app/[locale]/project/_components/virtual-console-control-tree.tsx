'use client';

import ButtonControl from '@/app/[locale]/project/_components/virtual-console-controls/button-control';
import FrameControl from '@/app/[locale]/project/_components/virtual-console-controls/frame-control';
import SliderControl from '@/app/[locale]/project/_components/virtual-console-controls/slider-control';
import type { VirtualConsoleControlMode } from '@/app/[locale]/project/_components/virtual-console-controls/virtual-console-control-properties';
import type { VirtualConsoleControl } from '@/app/[locale]/project/_components/virtual-console-document';
import type { PointerEvent } from 'react';

type VirtualConsoleControlTreeProperties = {
  controls: VirtualConsoleControl[];
  mode: VirtualConsoleControlMode;
  selectedControlId: string | null;
  onSelectControl: (id: string) => void;
  onMovePointerDown: (controlId: string, event: PointerEvent<HTMLDivElement>) => void;
};

const VirtualConsoleControlTree = ({
  controls,
  mode,
  selectedControlId,
  onSelectControl,
  onMovePointerDown,
}: VirtualConsoleControlTreeProperties) => {
  return (
    <>
      {controls.map(control => (
        <div
          key={control.id}
          data-testid={`virtual-console-control-${control.id}`}
          style={{
            height: control.height,
            left: control.x,
            position: 'absolute',
            top: control.y,
            width: control.width,
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
            <FrameControl control={control} mode={mode} selected={selectedControlId === control.id}>
              <VirtualConsoleControlTree
                controls={control.children ?? []}
                mode={mode}
                selectedControlId={selectedControlId}
                onSelectControl={onSelectControl}
                onMovePointerDown={onMovePointerDown}
              />
            </FrameControl>
          ) : null}
          {control.type === 'slider' ? (
            <SliderControl control={control} mode={mode} selected={selectedControlId === control.id} />
          ) : null}
          {control.type === 'button' ? (
            <ButtonControl control={control} mode={mode} selected={selectedControlId === control.id} />
          ) : null}
        </div>
      ))}
    </>
  );
};

export default VirtualConsoleControlTree;
