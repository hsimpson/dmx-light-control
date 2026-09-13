import { describe, expect, it } from 'vitest';
import {
  cloneVirtualConsoleDocument,
  createControl,
  createDefaultVirtualConsoleDocument,
  findControlAbsolutePosition,
  findDropTarget,
  findFrameOrigin,
  frameHeaderHeight,
  insertControlInTree,
  reparentControl,
  resizedControlBounds,
  snapControlBounds,
  snapToGrid,
  type VirtualConsoleDocument,
} from './virtual-console-document';

describe('virtual-console-document', () => {
  it('drops GraphQL __typename when cloning', () => {
    const cloned = cloneVirtualConsoleDocument({
      schemaVersion: 1,
      width: 1280,
      height: 720,
      __typename: 'VirtualConsoleDto',
      pages: [
        {
          __typename: 'VirtualConsolePageDto',
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Page 1',
          controls: [
            {
              __typename: 'VirtualConsoleControlDto',
              ...createControl('button', 0, 0),
              children: null,
              borderWidth: null,
            },
          ],
        },
      ],
    } as VirtualConsoleDocument);

    expect(JSON.stringify(cloned)).not.toContain('__typename');
    expect(cloned.pages[0]?.controls[0]?.type).toBe('button');
    expect(cloned.pages[0]?.controls[0]?.children).toBeUndefined();
  });

  it('creates a single Page 1', () => {
    const document = createDefaultVirtualConsoleDocument();
    expect(document.pages).toHaveLength(1);
    expect(document.pages[0]?.name).toBe('Page 1');
    expect(document.snap).toBe(1);
  });

  it('does not nest a drop on the frame header', () => {
    const frame = { ...createControl('frame', 10, 10), id: 'frame-1', width: 200, height: 200, children: [] };
    const target = findDropTarget([frame], 40, 10 + frameHeaderHeight(frame) - 1);
    expect(target.parentId).toBeNull();
    expect(target.localX).toBe(40);
    expect(target.localY).toBe(10 + frameHeaderHeight(frame) - 1);
  });

  it('nests a dropped control inside the deepest frame using the client area', () => {
    const frame = { ...createControl('frame', 10, 10), id: 'frame-1', width: 200, height: 200, children: [] };
    const inner = { ...createControl('frame', 20, 20), id: 'frame-2', width: 80, height: 80, children: [] };
    frame.children = [inner];
    const header = frameHeaderHeight(frame);
    const innerHeader = frameHeaderHeight(inner);
    const target = findDropTarget([frame], 40, 10 + header + 20 + innerHeader + 10);
    expect(target.parentId).toBe('frame-2');
    expect(target.localX).toBe(10);
    expect(target.localY).toBe(10);
    const next = insertControlInTree([frame], target.parentId, createControl('button', target.localX, target.localY));
    expect(next[0]?.children?.[0]?.children).toHaveLength(1);
  });

  it('places nested controls relative to the frame client origin', () => {
    const nested = { ...createControl('button', 8, 12), id: 'btn-1' };
    const frame = { ...createControl('frame', 10, 20), id: 'frame-1', width: 200, height: 160, children: [nested] };
    expect(findControlAbsolutePosition([frame], 'btn-1')).toEqual({
      x: 18,
      y: 20 + frameHeaderHeight(frame) + 12,
    });
    expect(findFrameOrigin([frame], 'frame-1')).toEqual({ x: 10, y: 20 + frameHeaderHeight(frame) });
  });

  it('reparents a control into another frame and keeps canvas position', () => {
    const button = { ...createControl('button', 30, 40), id: 'btn-1', width: 40, height: 20 };
    const frame = { ...createControl('frame', 10, 10), id: 'frame-1', width: 200, height: 200, children: [] };
    const tree = [frame, button];
    const next = reparentControl(tree, 'btn-1', 'frame-1', 20, 30);
    expect(next).toHaveLength(1);
    expect(next[0]?.children?.[0]?.id).toBe('btn-1');
    expect(next[0]?.children?.[0]?.x).toBe(20);
    expect(next[0]?.children?.[0]?.y).toBe(30);
    const backOnCanvas = reparentControl(next, 'btn-1', null, 400, 50);
    expect(backOnCanvas.map(control => control.id)).toEqual(['frame-1', 'btn-1']);
  });

  it('resizes from edges and corners and clamps to the minimum size', () => {
    const start = { x: 10, y: 20, width: 100, height: 80 };
    expect(resizedControlBounds(start, 15, 0, 'e')).toEqual({ x: 10, y: 20, width: 115, height: 80 });
    expect(resizedControlBounds(start, -12, 0, 'w')).toEqual({ x: -2, y: 20, width: 112, height: 80 });
    expect(resizedControlBounds(start, 0, -10, 'n')).toEqual({ x: 10, y: 10, width: 100, height: 90 });
    expect(resizedControlBounds(start, 0, 8, 's')).toEqual({ x: 10, y: 20, width: 100, height: 88 });
    expect(resizedControlBounds(start, 5, 6, 'se')).toEqual({ x: 10, y: 20, width: 105, height: 86 });
    expect(resizedControlBounds(start, 200, 200, 'nw')).toEqual({ x: 102, y: 92, width: 8, height: 8 });
  });

  it('snaps coordinates to the given grid', () => {
    expect(snapToGrid(50, 1)).toBe(50);
    expect(snapToGrid(50.4, 1)).toBe(50);
    expect(snapToGrid(50.5, 1)).toBe(51);
    expect(snapToGrid(50, 8)).toBe(48);
    expect(snapToGrid(53, 8)).toBe(56);
    expect(snapControlBounds({ x: 50, y: 11, width: 10, height: 9 }, 8)).toEqual({
      x: 48,
      y: 8,
      width: 8,
      height: 8,
    });
  });
});
