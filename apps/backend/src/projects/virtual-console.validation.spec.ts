import { describe, expect, it } from 'vitest';
import { InvalidVirtualConsoleException } from './project.exceptions';
import {
  VIRTUAL_CONSOLE_CONTROL_TYPE,
  VIRTUAL_CONSOLE_DEFAULT_HEIGHT,
  VIRTUAL_CONSOLE_DEFAULT_WIDTH,
  VIRTUAL_CONSOLE_SCHEMA_VERSION,
  VirtualConsoleDocument,
} from './virtual-console';
import { assertValidVirtualConsole, defaultVirtualConsoleDocument } from './virtual-console.validation';

const PAGE_ID = '11111111-1111-4111-8111-111111111111';
const FRAME_ID = '22222222-2222-4222-8222-222222222222';
const SLIDER_ID = '33333333-3333-4333-8333-333333333333';
const BUTTON_ID = '44444444-4444-4444-8444-444444444444';

function validDocument(overrides: Partial<VirtualConsoleDocument> = {}): VirtualConsoleDocument {
  return {
    schemaVersion: VIRTUAL_CONSOLE_SCHEMA_VERSION,
    width: VIRTUAL_CONSOLE_DEFAULT_WIDTH,
    height: VIRTUAL_CONSOLE_DEFAULT_HEIGHT,
    pages: [
      {
        id: PAGE_ID,
        name: 'Page 1',
        controls: [
          {
            id: FRAME_ID,
            type: VIRTUAL_CONSOLE_CONTROL_TYPE.Frame,
            x: 10,
            y: 10,
            width: 200,
            height: 160,
            label: 'Group',
            backgroundColor: '#222222',
            borderWidth: 2,
            borderColor: '#ffffff',
            children: [
              {
                id: SLIDER_ID,
                type: VIRTUAL_CONSOLE_CONTROL_TYPE.Slider,
                x: 8,
                y: 24,
                width: 40,
                height: 120,
                label: 'Dimmer',
                backgroundColor: '#111111',
                foregroundColor: '#88ff88',
                orientation: 'vertical',
                valueType: 'dmx',
              },
            ],
          },
          {
            id: BUTTON_ID,
            type: VIRTUAL_CONSOLE_CONTROL_TYPE.Button,
            x: 240,
            y: 10,
            width: 80,
            height: 40,
            label: 'Go',
            backgroundColor: '#444444',
            foregroundColor: '#ffffff',
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('defaultVirtualConsoleDocument', () => {
  it('returns schema 1, default size, and one Page 1', () => {
    const document = defaultVirtualConsoleDocument();
    expect(document.schemaVersion).toBe(1);
    expect(document.width).toBe(VIRTUAL_CONSOLE_DEFAULT_WIDTH);
    expect(document.height).toBe(VIRTUAL_CONSOLE_DEFAULT_HEIGHT);
    expect(document.pages).toHaveLength(1);
    expect(document.pages[0]?.name).toBe('Page 1');
    expect(document.pages[0]?.controls).toEqual([]);
    expect(() => {
      assertValidVirtualConsole(document);
    }).not.toThrow();
  });
});

describe('assertValidVirtualConsole', () => {
  it('accepts a nested frame with slider and a sibling button', () => {
    expect(() => {
      assertValidVirtualConsole(validDocument());
    }).not.toThrow();
  });

  it('rejects an empty page list', () => {
    expect(() => {
      assertValidVirtualConsole(validDocument({ pages: [] }));
    }).toThrow(InvalidVirtualConsoleException);
  });

  it('rejects schemaVersion other than 1', () => {
    expect(() => {
      assertValidVirtualConsole(validDocument({ schemaVersion: 2 }));
    }).toThrow(InvalidVirtualConsoleException);
  });

  it('rejects duplicate control ids', () => {
    const document = validDocument();
    const page = document.pages[0];
    if (!page) {
      throw new Error('expected page');
    }
    page.controls.push({
      id: SLIDER_ID,
      type: VIRTUAL_CONSOLE_CONTROL_TYPE.Button,
      x: 0,
      y: 0,
      width: 40,
      height: 40,
      label: 'Dup',
      backgroundColor: '#000000',
      foregroundColor: '#ffffff',
    });
    expect(() => {
      assertValidVirtualConsole(document);
    }).toThrow(InvalidVirtualConsoleException);
  });

  it('rejects frames nested deeper than 8', () => {
    let children: VirtualConsoleDocument['pages'][number]['controls'] = [];
    for (let depth = 9; depth >= 1; depth -= 1) {
      children = [
        {
          id: `55555555-5555-4555-8555-55555555555${depth}`,
          type: VIRTUAL_CONSOLE_CONTROL_TYPE.Frame,
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          label: `L${depth}`,
          backgroundColor: '#000000',
          borderWidth: 1,
          borderColor: '#ffffff',
          children,
        },
      ];
    }
    const document = validDocument({
      pages: [{ id: PAGE_ID, name: 'Page 1', controls: children }],
    });
    expect(() => {
      assertValidVirtualConsole(document);
    }).toThrow(InvalidVirtualConsoleException);
  });

  it('accepts GraphQL null optional fields on sliders, buttons, and a second page', () => {
    const document = validDocument({
      pages: [
        {
          id: PAGE_ID,
          name: 'Page 1',
          controls: [
            {
              id: SLIDER_ID,
              type: VIRTUAL_CONSOLE_CONTROL_TYPE.Slider,
              x: 0,
              y: 0,
              width: 40,
              height: 120,
              label: 'Dimmer',
              backgroundColor: '#111111',
              foregroundColor: '#88ff88',
              orientation: 'vertical',
              valueType: 'dmx',
              children: null as unknown as undefined,
              borderWidth: null as unknown as undefined,
              borderColor: null as unknown as undefined,
            },
            {
              id: BUTTON_ID,
              type: VIRTUAL_CONSOLE_CONTROL_TYPE.Button,
              x: 50,
              y: 0,
              width: 80,
              height: 40,
              label: 'Go',
              backgroundColor: '#444444',
              foregroundColor: '#ffffff',
              children: null as unknown as undefined,
            },
          ],
        },
        {
          id: '55555555-5555-4555-8555-555555555555',
          name: 'Page 2',
          controls: [],
        },
      ],
    });
    expect(() => {
      assertValidVirtualConsole(document);
    }).not.toThrow();
  });

  it('rejects children on a slider', () => {
    const document = validDocument({
      pages: [
        {
          id: PAGE_ID,
          name: 'Page 1',
          controls: [
            {
              id: SLIDER_ID,
              type: VIRTUAL_CONSOLE_CONTROL_TYPE.Slider,
              x: 0,
              y: 0,
              width: 40,
              height: 120,
              label: 'Dimmer',
              backgroundColor: '#111111',
              foregroundColor: '#88ff88',
              orientation: 'vertical',
              valueType: 'dmx',
              children: [
                {
                  id: BUTTON_ID,
                  type: VIRTUAL_CONSOLE_CONTROL_TYPE.Button,
                  x: 0,
                  y: 0,
                  width: 20,
                  height: 20,
                  label: 'Nested',
                  backgroundColor: '#000000',
                  foregroundColor: '#ffffff',
                },
              ],
            },
          ],
        },
      ],
    });
    expect(() => {
      assertValidVirtualConsole(document);
    }).toThrow(InvalidVirtualConsoleException);
  });
});
