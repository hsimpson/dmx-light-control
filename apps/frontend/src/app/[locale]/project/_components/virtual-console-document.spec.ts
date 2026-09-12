import { describe, expect, it } from 'vitest';
import {
  cloneVirtualConsoleDocument,
  createControl,
  createDefaultVirtualConsoleDocument,
  findDropTarget,
  insertControlInTree,
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
});
