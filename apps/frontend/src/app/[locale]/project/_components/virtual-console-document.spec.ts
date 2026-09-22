import { describe, expect, it } from 'vitest';
import {
  cloneControlForPaste,
  cloneVirtualConsoleDocument,
  createControl,
  createDefaultVirtualConsoleDocument,
  extractControl,
  findControl,
  findControlAbsolutePosition,
  findControlParentId,
  findDropTarget,
  findFrameOrigin,
  frameHeaderHeight,
  insertControlInTree,
  reparentControl,
  resizedControlBounds,
  snapControlBounds,
  snapToGrid,
  updateControlInTree,
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

  it('keeps channel bindings and drops an empty list', () => {
    const button = {
      ...createControl('button', 0, 0),
      channelBindings: [
        {
          projectFixturePublicId: '55555555-5555-4555-8555-555555555555',
          channelAssignmentPublicId: '66666666-6666-4666-8666-666666666666',
        },
      ],
    };
    const cloned = cloneVirtualConsoleDocument({
      schemaVersion: 1,
      width: 1280,
      height: 720,
      pages: [
        {
          id: 'page',
          name: 'Page 1',
          controls: [button, { ...createControl('slider', 0, 0), channelBindings: undefined }],
        },
      ],
    });
    expect(cloned.pages[0]?.controls[0]?.channelBindings).toEqual(button.channelBindings);
    expect(cloned.pages[0]?.controls[1]).not.toHaveProperty('channelBindings');
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
    expect(snapToGrid(50, 0)).toBe(50);
    expect(snapControlBounds({ x: 50, y: 11, width: 10, height: 9 }, 8)).toEqual({
      x: 48,
      y: 8,
      width: 8,
      height: 8,
    });
    expect(snapControlBounds({ x: 1, y: 1, width: 0, height: 0 }, 8)).toEqual({
      x: 0,
      y: 0,
      width: 8,
      height: 8,
    });
  });

  it('clamps west and north when resized below the minimum', () => {
    const start = { x: 10, y: 20, width: 100, height: 80 };
    expect(resizedControlBounds(start, 200, -200, 'sw')).toEqual({ x: 102, y: 20, width: 8, height: 8 });
    expect(resizedControlBounds(start, 0, 200, 's')).toEqual({ x: 10, y: 20, width: 100, height: 280 });
    expect(resizedControlBounds(start, 0, 200, 'ne')).toEqual({ x: 10, y: 92, width: 100, height: 8 });
  });

  it('finds, patches and extracts nested controls', () => {
    const nested = { ...createControl('button', 8, 8), id: 'btn-1', label: 'Go' };
    const frame = { ...createControl('frame', 0, 0), id: 'frame-1', children: [nested] };
    const other = { ...createControl('button', 40, 0), id: 'btn-2' };

    expect(findControl([frame, other], 'btn-1')?.label).toBe('Go');
    expect(findControl([frame, other], 'missing')).toBeUndefined();
    expect(findControlParentId([frame, other], 'btn-1')).toBe('frame-1');
    expect(findControlParentId([frame, other], 'frame-1')).toBeNull();
    expect(findControlParentId([frame, other], 'missing')).toBeUndefined();

    const patched = updateControlInTree([frame, other], 'btn-1', { label: 'Stop' });
    expect(findControl(patched, 'btn-1')?.label).toBe('Stop');
    expect(updateControlInTree([other], 'btn-2', { label: 'X' })[0]?.label).toBe('X');

    const extracted = extractControl([frame, other], 'btn-1');
    expect(extracted.control?.id).toBe('btn-1');
    expect(extracted.controls[0]?.children).toEqual([]);
    expect(extractControl([other], 'missing').control).toBeUndefined();
  });

  it('returns canvas origin when the parent is missing or not a frame', () => {
    const button = { ...createControl('button', 12, 24), id: 'btn-1' };
    expect(findFrameOrigin([button], null)).toEqual({ x: 0, y: 0 });
    expect(findFrameOrigin([button], 'btn-1')).toEqual({ x: 12, y: 24 });
    expect(findFrameOrigin([button], 'missing')).toEqual({ x: 0, y: 0 });
    expect(findControlAbsolutePosition([button], 'missing')).toBeUndefined();
  });

  it('leaves the tree unchanged when reparenting a missing control', () => {
    const button = { ...createControl('button', 0, 0), id: 'btn-1' };
    expect(reparentControl([button], 'missing', null, 1, 1)).toEqual([button]);
  });

  it('inserts into a nested frame and skips unrelated branches', () => {
    const inner = { ...createControl('frame', 4, 4), id: 'inner', children: [] };
    const outer = { ...createControl('frame', 0, 0), id: 'outer', children: [inner] };
    const sibling = { ...createControl('button', 80, 0), id: 'btn-2' };
    const next = insertControlInTree([outer, sibling], 'inner', createControl('button', 1, 2));
    expect(next[0]?.children?.[0]?.children).toHaveLength(1);
    expect(next[1]?.id).toBe('btn-2');
  });

  it('ignores a dragged frame when finding a drop target', () => {
    const frame = { ...createControl('frame', 0, 0), id: 'frame-1', width: 200, height: 200, children: [] };
    const target = findDropTarget([frame], 40, 40 + frameHeaderHeight(frame), 'frame-1');
    expect(target.parentId).toBeNull();
  });

  it('clones a control for paste with new ids and a root label suffix', () => {
    const child = {
      ...createControl('slider', 4, 6),
      id: 'child',
      label: 'Nested',
      orientation: 'horizontal' as const,
      valueType: 'percentage' as const,
      foregroundColor: '#ffcc00',
      channelBindings: [
        {
          projectFixturePublicId: '55555555-5555-4555-8555-555555555555',
          channelAssignmentPublicId: '66666666-6666-4666-8666-666666666666',
        },
      ],
    };
    const frame = {
      ...createControl('frame', 10, 20),
      id: 'frame',
      label: 'Group',
      width: 240,
      height: 180,
      backgroundColor: '#112233',
      borderWidth: 3,
      borderColor: '#abcdef',
      fontFamily: 'Inter',
      fontSize: 18,
      fontWeight: 700,
      children: [child],
    };

    const pasted = cloneControlForPaste(frame);

    expect(pasted).toMatchObject({
      type: 'frame',
      x: 10,
      y: 20,
      width: 240,
      height: 180,
      label: 'Group (1)',
      backgroundColor: '#112233',
      borderWidth: 3,
      borderColor: '#abcdef',
      fontFamily: 'Inter',
      fontSize: 18,
      fontWeight: 700,
    });
    expect(pasted.id).not.toBe(frame.id);
    expect(pasted.children).toHaveLength(1);
    expect(pasted.children?.[0]).toMatchObject({
      type: 'slider',
      x: 4,
      y: 6,
      label: 'Nested',
      orientation: 'horizontal',
      valueType: 'percentage',
      foregroundColor: '#ffcc00',
      backgroundColor: child.backgroundColor,
      width: child.width,
      height: child.height,
    });
    expect(pasted.children?.[0]?.id).not.toBe(child.id);
    expect(pasted.children?.[0]?.id).not.toBe(pasted.id);
    expect(pasted.children?.[0]?.channelBindings).toEqual(child.channelBindings);
    expect(pasted.children?.[0]?.channelBindings).not.toBe(child.channelBindings);
    expect(pasted.children).not.toBe(frame.children);

    frame.label = 'Changed';
    child.label = 'Changed child';
    const binding = child.channelBindings[0];
    if (binding) {
      binding.projectFixturePublicId = 'changed';
    }
    expect(pasted.label).toBe('Group (1)');
    expect(pasted.children?.[0]?.label).toBe('Nested');
    expect(pasted.children?.[0]?.channelBindings?.[0]?.projectFixturePublicId).toBe(
      '55555555-5555-4555-8555-555555555555',
    );

    const again = cloneControlForPaste({ ...createControl('button', 0, 0), label: 'Slider (1)' });
    expect(again.label).toBe('Slider (1) (1)');
    expect(again.id).not.toBe(pasted.id);
    expect(again.children).toBeUndefined();
  });
});
