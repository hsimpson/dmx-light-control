import { describe, expect, it } from 'vitest';
import {
  cloneVirtualConsoleDocument,
  createControl,
  createDefaultVirtualConsoleDocument,
  findDropTarget,
  insertControlInTree,
  reparentControl,
  resizedControlBounds,
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
  });

  it('nests a dropped control inside the deepest frame', () => {
    const frame = { ...createControl('frame', 10, 10), id: 'frame-1', width: 200, height: 200, children: [] };
    const inner = { ...createControl('frame', 20, 20), id: 'frame-2', width: 80, height: 80, children: [] };
    frame.children = [inner];
    const target = findDropTarget([frame], 40, 40);
    expect(target.parentId).toBe('frame-2');
    const next = insertControlInTree([frame], target.parentId, createControl('button', target.localX, target.localY));
    expect(next[0]?.children?.[0]?.children).toHaveLength(1);
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
});
