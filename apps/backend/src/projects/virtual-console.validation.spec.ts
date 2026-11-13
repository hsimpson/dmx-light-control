import { describe, expect, it, vi } from 'vitest';
import { InvalidVirtualConsoleException } from './project.exceptions';
import {
  VIRTUAL_CONSOLE_CONTROL_TYPE,
  VIRTUAL_CONSOLE_DEFAULT_HEIGHT,
  VIRTUAL_CONSOLE_DEFAULT_WIDTH,
  VIRTUAL_CONSOLE_SCHEMA_VERSION,
  VirtualConsoleAudioBar,
  VirtualConsoleChannelBinding,
  VirtualConsoleControl,
  VirtualConsoleDocument,
} from './virtual-console';
import {
  assertValidVirtualConsole,
  assertVirtualConsoleChannelBindings,
  assertVirtualConsoleFunctionBindings,
  defaultVirtualConsoleDocument,
  enrichVirtualConsoleForExport,
  remapVirtualConsoleBindingsForImport,
  remapVirtualConsoleFunctionsForImport,
  removeFunctionBindings,
  sanitizeVirtualConsoleForImport,
  stripVirtualConsoleBindingHints,
} from './virtual-console.validation';

const PAGE_ID = '11111111-1111-4111-8111-111111111111';
const FRAME_ID = '22222222-2222-4222-8222-222222222222';
const SLIDER_ID = '33333333-3333-4333-8333-333333333333';
const BUTTON_ID = '44444444-4444-4444-8444-444444444444';
const FIXTURE_ID = '55555555-5555-4555-8555-555555555555';
const ASSIGNMENT_ID = '66666666-6666-4666-8666-666666666666';
const OTHER_ASSIGNMENT_ID = '77777777-7777-4777-8777-777777777777';

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
    expect(document.snap).toBe(1);
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

  it('rejects snap outside 1 to 128', () => {
    expect(() => {
      assertValidVirtualConsole(validDocument({ snap: 0 }));
    }).toThrow(InvalidVirtualConsoleException);
    expect(() => {
      assertValidVirtualConsole(validDocument({ snap: 129 }));
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

  it('treats GraphQL null typography as omitted', () => {
    const document = validDocument();
    const button = document.pages[0]?.controls[1];
    if (!button) {
      throw new Error('expected button');
    }
    button.fontFamily = null as unknown as undefined;
    button.fontSize = null as unknown as undefined;
    button.fontWeight = null as unknown as undefined;
    expect(() => {
      assertValidVirtualConsole(document);
    }).not.toThrow();
  });

  it('accepts optional typography on every control type', () => {
    const document = validDocument();
    const page = document.pages[0];
    const frame = page?.controls[0];
    const slider = frame?.children?.[0];
    const button = page?.controls[1];
    if (!frame || !slider || !button) {
      throw new Error('expected controls');
    }
    frame.fontFamily = 'Arial, Helvetica, sans-serif';
    frame.fontSize = 14;
    frame.fontWeight = 700;
    slider.fontFamily = 'Georgia, serif';
    slider.fontSize = 11;
    slider.fontWeight = 400;
    button.fontFamily = 'system-ui, sans-serif';
    button.fontSize = 18;
    button.fontWeight = 600;
    expect(() => {
      assertValidVirtualConsole(document);
    }).not.toThrow();
  });

  it('rejects an invalid font size', () => {
    const document = validDocument();
    const button = document.pages[0]?.controls[1];
    if (!button) {
      throw new Error('expected button');
    }
    button.fontSize = 3;
    expect(() => {
      assertValidVirtualConsole(document);
    }).toThrow(InvalidVirtualConsoleException);
  });

  it('sanitizes null channelBindings from import documents', () => {
    const document = validDocument();
    const button = document.pages[0]?.controls[1];
    if (!button) {
      throw new Error('expected button');
    }
    button.channelBindings = null as unknown as VirtualConsoleChannelBinding[];
    const sanitized = sanitizeVirtualConsoleForImport(document);
    expect(sanitized.pages[0]?.controls[1]).not.toHaveProperty('channelBindings');
    expect(() => {
      assertValidVirtualConsole(sanitized);
    }).not.toThrow();
  });

  it('accepts slider and button channel bindings and an empty list on a frame', () => {
    const document = validDocument();
    const frame = document.pages[0]?.controls[0];
    const slider = frame?.children?.[0];
    const button = document.pages[0]?.controls[1];
    if (!frame || !slider || !button) {
      throw new Error('expected controls');
    }
    frame.channelBindings = [];
    slider.channelBindings = [{ projectFixturePublicId: FIXTURE_ID, channelAssignmentPublicId: ASSIGNMENT_ID }];
    button.channelBindings = [
      { projectFixturePublicId: FIXTURE_ID, channelAssignmentPublicId: ASSIGNMENT_ID },
      { projectFixturePublicId: FIXTURE_ID, channelAssignmentPublicId: OTHER_ASSIGNMENT_ID },
    ];
    expect(() => {
      assertValidVirtualConsole(document);
    }).not.toThrow();
  });

  it('rejects channel bindings on a frame', () => {
    const document = validDocument();
    const frame = document.pages[0]?.controls[0];
    if (!frame) {
      throw new Error('expected frame');
    }
    frame.channelBindings = [{ projectFixturePublicId: FIXTURE_ID, channelAssignmentPublicId: ASSIGNMENT_ID }];
    expect(() => {
      assertValidVirtualConsole(document);
    }).toThrow(InvalidVirtualConsoleException);
  });

  it('rejects a duplicate channel binding on one control', () => {
    const document = validDocument();
    const button = document.pages[0]?.controls[1];
    if (!button) {
      throw new Error('expected button');
    }
    const binding = { projectFixturePublicId: FIXTURE_ID, channelAssignmentPublicId: ASSIGNMENT_ID };
    button.channelBindings = [binding, binding];
    expect(() => {
      assertValidVirtualConsole(document);
    }).toThrow(InvalidVirtualConsoleException);
  });

  it('enriches virtual console bindings with channel metadata on export', () => {
    const document = validDocument();
    const button = document.pages[0]?.controls[1];
    if (!button) {
      throw new Error('expected button');
    }
    button.channelBindings = [{ projectFixturePublicId: FIXTURE_ID, channelAssignmentPublicId: ASSIGNMENT_ID }];
    const enriched = enrichVirtualConsoleForExport(document, [
      {
        publicId: FIXTURE_ID,
        fixtureChannelMode: {
          fixtureChannelAssignments: [
            {
              publicId: ASSIGNMENT_ID,
              channelNumber: 2,
              fixtureChannelDefinition: { publicId: 'def-red' },
            },
          ],
        },
      },
    ]);
    expect(enriched?.pages[0]?.controls[1]?.channelBindings).toEqual([
      {
        projectFixturePublicId: FIXTURE_ID,
        channelAssignmentPublicId: ASSIGNMENT_ID,
        channelNumber: 2,
        channelDefinitionPublicId: 'def-red',
      },
    ]);
    expect(stripVirtualConsoleBindingHints(enriched ?? document).pages[0]?.controls[1]?.channelBindings).toEqual([
      { projectFixturePublicId: FIXTURE_ID, channelAssignmentPublicId: ASSIGNMENT_ID },
    ]);
  });

  it('remaps stale channel assignment publicIds using export channelNumber hints', async () => {
    const document = validDocument();
    const button = document.pages[0]?.controls[1];
    if (!button) {
      throw new Error('expected button');
    }
    const staleAssignmentId = '88888888-8888-4888-8888-888888888888';
    const currentAssignmentId = '99999999-9999-4999-8999-999999999999';
    button.channelBindings = [
      {
        projectFixturePublicId: FIXTURE_ID,
        channelAssignmentPublicId: staleAssignmentId,
        channelNumber: 1,
      },
    ];
    const fixtures = [
      {
        publicId: FIXTURE_ID,
        channelAssignmentPublicIds: new Set([currentAssignmentId]),
        channelAssignmentPublicIdByChannelNumber: new Map([[1, currentAssignmentId]]),
      },
    ];
    const lookup = vi.fn<(assignmentPublicId: string) => Promise<number | undefined>>().mockResolvedValue(undefined);
    const remapped = await remapVirtualConsoleBindingsForImport(document, fixtures, lookup);
    expect(remapped.pages[0]?.controls[1]?.channelBindings).toEqual([
      { projectFixturePublicId: FIXTURE_ID, channelAssignmentPublicId: currentAssignmentId },
    ]);
  });

  it('remaps stale channel assignment publicIds by channel number during import', async () => {
    const document = validDocument();
    const button = document.pages[0]?.controls[1];
    if (!button) {
      throw new Error('expected button');
    }
    const staleAssignmentId = '88888888-8888-4888-8888-888888888888';
    const currentAssignmentId = '99999999-9999-4999-8999-999999999999';
    button.channelBindings = [{ projectFixturePublicId: FIXTURE_ID, channelAssignmentPublicId: staleAssignmentId }];
    const fixtures = [
      {
        publicId: FIXTURE_ID,
        channelAssignmentPublicIds: new Set([currentAssignmentId]),
        channelAssignmentPublicIdByChannelNumber: new Map([[1, currentAssignmentId]]),
      },
    ];
    const remapped = await remapVirtualConsoleBindingsForImport(
      document,
      fixtures,
      async assignmentPublicId => await Promise.resolve(assignmentPublicId === staleAssignmentId ? 1 : undefined),
    );
    expect(remapped.pages[0]?.controls[1]?.channelBindings).toEqual([
      { projectFixturePublicId: FIXTURE_ID, channelAssignmentPublicId: currentAssignmentId },
    ]);
    expect(() => {
      assertVirtualConsoleChannelBindings(remapped, fixtures);
    }).not.toThrow();
  });

  it('accepts a binding that belongs to the fixture mode and rejects one that does not', () => {
    const document = validDocument();
    const button = document.pages[0]?.controls[1];
    if (!button) {
      throw new Error('expected button');
    }
    const fixtures = [{ publicId: FIXTURE_ID, channelAssignmentPublicIds: new Set([ASSIGNMENT_ID]) }];
    button.channelBindings = [{ projectFixturePublicId: FIXTURE_ID, channelAssignmentPublicId: ASSIGNMENT_ID }];
    expect(() => {
      assertVirtualConsoleChannelBindings(document, fixtures);
    }).not.toThrow();
    button.channelBindings = [{ projectFixturePublicId: FIXTURE_ID, channelAssignmentPublicId: OTHER_ASSIGNMENT_ID }];
    expect(() => {
      assertVirtualConsoleChannelBindings(document, fixtures);
    }).toThrow(InvalidVirtualConsoleException);
    button.channelBindings = [
      { projectFixturePublicId: OTHER_ASSIGNMENT_ID, channelAssignmentPublicId: ASSIGNMENT_ID },
    ];
    expect(() => {
      assertVirtualConsoleChannelBindings(document, fixtures);
    }).toThrow(InvalidVirtualConsoleException);
  });

  it('accepts omitted slider and button limits and explicit limits in range', () => {
    expect(() => {
      assertValidVirtualConsole(validDocument());
    }).not.toThrow();

    const document = validDocument();
    const slider = document.pages[0]?.controls[0]?.children?.[0];
    const button = document.pages[0]?.controls[1];
    if (!slider || !button) {
      throw new Error('expected slider and button');
    }
    slider.lowerLimit = 10;
    slider.upperLimit = 200;
    button.upperLimit = 128;
    expect(() => {
      assertValidVirtualConsole(document);
    }).not.toThrow();

    slider.lowerLimit = null;
    slider.upperLimit = null;
    button.upperLimit = null;
    expect(() => {
      assertValidVirtualConsole(document);
    }).not.toThrow();
  });

  it('rejects slider and button limits outside 0 to 255 and a slider whose lower limit exceeds its upper limit', () => {
    const document = validDocument();
    const slider = document.pages[0]?.controls[0]?.children?.[0];
    const button = document.pages[0]?.controls[1];
    if (!slider || !button) {
      throw new Error('expected slider and button');
    }

    slider.lowerLimit = -1;
    expect(() => {
      assertValidVirtualConsole(document);
    }).toThrow(InvalidVirtualConsoleException);
    slider.lowerLimit = 1.5;
    expect(() => {
      assertValidVirtualConsole(document);
    }).toThrow(InvalidVirtualConsoleException);
    slider.lowerLimit = 200;
    slider.upperLimit = 10;
    expect(() => {
      assertValidVirtualConsole(document);
    }).toThrow(InvalidVirtualConsoleException);

    slider.lowerLimit = 0;
    slider.upperLimit = 256;
    expect(() => {
      assertValidVirtualConsole(document);
    }).toThrow(InvalidVirtualConsoleException);

    slider.upperLimit = 255;
    button.upperLimit = 256;
    expect(() => {
      assertValidVirtualConsole(document);
    }).toThrow(InvalidVirtualConsoleException);
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

  it('rejects a button that binds both channels and a function', () => {
    const document = validDocument();
    const button = document.pages[0]?.controls[1];
    if (!button) {
      throw new Error('missing button');
    }
    button.channelBindings = [{ projectFixturePublicId: FIXTURE_ID, channelAssignmentPublicId: ASSIGNMENT_ID }];
    button.functionPublicId = '88888888-8888-4888-8888-888888888888';
    expect(() => {
      assertValidVirtualConsole(document);
    }).toThrow(/both channels and a function/);
  });

  it('accepts null function fields on a frame from an export', () => {
    const document = validDocument();
    const frame = document.pages[0]?.controls[0];
    if (!frame) {
      throw new Error('missing frame');
    }
    Object.assign(frame, { functionPublicId: null, functionName: null, buttonMode: null });
    expect(() => {
      assertValidVirtualConsole(document);
    }).not.toThrow();
  });

  it('rejects a function binding on a slider', () => {
    const document = validDocument();
    const slider = document.pages[0]?.controls[0]?.children?.[0];
    if (!slider) {
      throw new Error('missing slider');
    }
    slider.functionPublicId = '88888888-8888-4888-8888-888888888888';
    expect(() => {
      assertValidVirtualConsole(document);
    }).toThrow(InvalidVirtualConsoleException);
  });

  it('rejects a function that does not belong to the project', () => {
    const document = validDocument();
    const button = document.pages[0]?.controls[1];
    if (!button) {
      throw new Error('missing button');
    }
    button.functionPublicId = '88888888-8888-4888-8888-888888888888';
    expect(() => {
      assertVirtualConsoleFunctionBindings(document, new Set());
    }).toThrow(/does not belong to this project/);
  });

  describe('MIDI input binding', () => {
    const ENTRY_ID = '99999999-9999-4999-8999-999999999999';
    const feedback = {
      off: { behavior: 0, color: 0 },
      on: { behavior: 6, color: 5 },
      monitor: { behavior: 13, color: 9 },
    };

    function controls() {
      const document = validDocument();
      const frame = document.pages[0]?.controls[0];
      const slider = frame?.children?.[0];
      const button = document.pages[0]?.controls[1];
      if (!frame || !slider || !button) {
        throw new Error('missing controls');
      }
      return { document, frame, slider, button };
    }

    it('GIVEN a button and a slider WHEN bound to a MIDI entry with feedback THEN the document is valid', () => {
      const { document, slider, button } = controls();
      Object.assign(button, { midiEntryPublicId: ENTRY_ID, feedback });
      Object.assign(slider, { midiEntryPublicId: ENTRY_ID, feedback: { off: feedback.off, on: feedback.on } });

      expect(() => {
        assertValidVirtualConsole(document);
      }).not.toThrow();
    });

    it('GIVEN a control bound to an entry WHEN scoped to devices THEN the document is valid', () => {
      const { document, button } = controls();
      Object.assign(button, { midiEntryPublicId: ENTRY_ID, midiDeviceSerials: ['25082560709810'] });

      expect(() => {
        assertValidVirtualConsole(document);
      }).not.toThrow();
    });

    it('GIVEN a frame from an export WHEN its MIDI fields are null THEN the document is valid', () => {
      const { document, frame } = controls();
      Object.assign(frame, { midiEntryPublicId: null, midiDeviceSerials: null, feedback: null });

      expect(() => {
        assertValidVirtualConsole(document);
      }).not.toThrow();
    });

    it.each([
      [
        'a MIDI binding on a frame',
        (c: ReturnType<typeof controls>) => Object.assign(c.frame, { midiEntryPublicId: ENTRY_ID }),
      ],
      ['a non-UUID entry id', (c: ReturnType<typeof controls>) => Object.assign(c.button, { midiEntryPublicId: 'x' })],
      [
        'a device scope without an entry',
        (c: ReturnType<typeof controls>) => Object.assign(c.button, { midiDeviceSerials: ['25082560709810'] }),
      ],
      [
        'a device scope on a frame',
        (c: ReturnType<typeof controls>) => Object.assign(c.frame, { midiDeviceSerials: ['25082560709810'] }),
      ],
      [
        'a behavior above 15',
        (c: ReturnType<typeof controls>) =>
          Object.assign(c.button, { feedback: { ...feedback, on: { behavior: 16, color: 0 } } }),
      ],
      [
        'a color above 127',
        (c: ReturnType<typeof controls>) =>
          Object.assign(c.button, { feedback: { ...feedback, monitor: { behavior: 0, color: 128 } } }),
      ],
      [
        'feedback without an off state',
        (c: ReturnType<typeof controls>) => Object.assign(c.button, { feedback: { on: feedback.on } }),
      ],
    ])('GIVEN %s WHEN validated THEN it is rejected', (_case, change) => {
      const parts = controls();
      change(parts);

      expect(() => {
        assertValidVirtualConsole(parts.document);
      }).toThrow(InvalidVirtualConsoleException);
    });
  });
});

describe('audio triggers', () => {
  const AUDIO_ID = '88888888-8888-4888-8888-888888888888';
  const FUNCTION_ID = '99999999-9999-4999-8999-999999999999';
  const binding = { projectFixturePublicId: FIXTURE_ID, channelAssignmentPublicId: ASSIGNMENT_ID };
  const idle: VirtualConsoleAudioBar = { mode: 'none', minThreshold: 20, maxThreshold: 80 };

  function audioControl(overrides: Partial<VirtualConsoleControl> = {}): VirtualConsoleControl {
    return {
      id: AUDIO_ID,
      type: VIRTUAL_CONSOLE_CONTROL_TYPE.AudioTriggers,
      x: 0,
      y: 0,
      width: 320,
      height: 160,
      label: 'Sound',
      backgroundColor: '#000000',
      bandCount: 2,
      audioBars: [
        { mode: 'function', minThreshold: 20, maxThreshold: 80, functionPublicId: FUNCTION_ID },
        { mode: 'channels', minThreshold: 10, maxThreshold: 90, channelBindings: [binding] },
        idle,
      ],
      ...overrides,
    };
  }

  const documentWith = (control: VirtualConsoleControl): VirtualConsoleDocument =>
    validDocument({ pages: [{ id: PAGE_ID, name: 'Page 1', controls: [control] }] });

  it('GIVEN a volume bar and one bar per band WHEN validated THEN it is accepted', () => {
    expect(() => {
      assertValidVirtualConsole(documentWith(audioControl()));
    }).not.toThrow();
  });

  it.each<[string, Partial<VirtualConsoleControl>]>([
    ['zero bands', { bandCount: 0, audioBars: [idle] }],
    ['17 bands', { bandCount: 17, audioBars: Array.from({ length: 18 }, () => idle) }],
    ['a missing volume bar', { bandCount: 2, audioBars: [idle, idle] }],
    ['min equal to max', { bandCount: 1, audioBars: [idle, { ...idle, minThreshold: 50, maxThreshold: 50 }] }],
    ['a threshold above 100', { bandCount: 1, audioBars: [idle, { ...idle, maxThreshold: 101 }] }],
    ['an unknown mode', { bandCount: 1, audioBars: [idle, { ...idle, mode: 'strobe' as 'none' }] }],
    ['a function name on an idle bar', { bandCount: 1, audioBars: [idle, { ...idle, functionName: 'Strobe' }] }],
    [
      'channels on a function bar',
      { bandCount: 1, audioBars: [idle, { ...idle, mode: 'function', channelBindings: [binding] }] },
    ],
    [
      'a function on a channels bar',
      { bandCount: 1, audioBars: [idle, { ...idle, mode: 'channels', functionPublicId: FUNCTION_ID }] },
    ],
    [
      'a duplicate channel',
      { bandCount: 1, audioBars: [idle, { ...idle, mode: 'channels', channelBindings: [binding, binding] }] },
    ],
  ])('GIVEN %s WHEN validated THEN it is rejected', (_case, overrides) => {
    expect(() => {
      assertValidVirtualConsole(documentWith(audioControl(overrides)));
    }).toThrow(InvalidVirtualConsoleException);
  });

  it('GIVEN audio bars on a button WHEN validated THEN they are rejected', () => {
    const document = validDocument();
    const button = document.pages[0]?.controls[1];
    if (button) Object.assign(button, { bandCount: 1, audioBars: [idle, idle] });

    expect(() => {
      assertValidVirtualConsole(document);
    }).toThrow('cannot have audio bars');
  });

  it('GIVEN bar bindings WHEN checked against the project THEN unknown functions and channels are rejected', () => {
    const document = documentWith(audioControl());
    const fixtures = [{ publicId: FIXTURE_ID, channelAssignmentPublicIds: new Set([OTHER_ASSIGNMENT_ID]) }];

    expect(() => {
      assertVirtualConsoleFunctionBindings(document, new Set());
    }).toThrow(FUNCTION_ID);
    expect(() => {
      assertVirtualConsoleChannelBindings(document, fixtures);
    }).toThrow(ASSIGNMENT_ID);
  });

  it('GIVEN bar bindings WHEN exported and stripped again THEN hints are added and removed per bar', () => {
    const exported = enrichVirtualConsoleForExport(
      documentWith(audioControl()),
      [
        {
          publicId: FIXTURE_ID,
          fixtureChannelMode: { fixtureChannelAssignments: [{ publicId: ASSIGNMENT_ID, channelNumber: 3 }] },
        },
      ],
      [{ publicId: FUNCTION_ID, name: 'Chase' }],
    );
    const bars = exported?.pages[0]?.controls[0]?.audioBars;

    expect(bars?.[0]).toMatchObject({ functionPublicId: FUNCTION_ID, functionName: 'Chase' });
    expect(bars?.[1]?.channelBindings).toEqual([{ ...binding, channelNumber: 3 }]);
    const stripped = exported && stripVirtualConsoleBindingHints(exported).pages[0]?.controls[0]?.audioBars;
    expect(stripped?.[0]?.functionName).toBeUndefined();
    expect(stripped?.[1]?.channelBindings).toEqual([binding]);
  });

  it('GIVEN an imported bar function by name WHEN remapped THEN it binds the new function id', () => {
    const imported = documentWith(
      audioControl({
        bandCount: 1,
        audioBars: [
          {
            mode: 'function',
            minThreshold: 20,
            maxThreshold: 80,
            functionName: 'Chase',
            functionPublicId: FUNCTION_ID,
          },
          idle,
        ],
      }),
    );

    const remapped = remapVirtualConsoleFunctionsForImport(imported, [{ publicId: SLIDER_ID, name: 'Chase' }]);

    expect(remapped.pages[0]?.controls[0]?.audioBars?.[0]).toMatchObject({
      functionPublicId: SLIDER_ID,
      functionName: undefined,
    });
  });

  it('GIVEN a deleted function WHEN bindings are removed THEN the bar loses it', () => {
    const cleaned = removeFunctionBindings(documentWith(audioControl()), FUNCTION_ID);

    expect(cleaned.pages[0]?.controls[0]?.audioBars?.[0]?.functionPublicId).toBeUndefined();
  });

  it('GIVEN a bar binding to a remapped assignment WHEN imported THEN it is resolved by channel number', async () => {
    const fixtures = [
      {
        publicId: FIXTURE_ID,
        channelAssignmentPublicIds: new Set([OTHER_ASSIGNMENT_ID]),
        channelAssignmentPublicIdByChannelNumber: new Map([[3, OTHER_ASSIGNMENT_ID]]),
      },
    ];

    const remapped = await remapVirtualConsoleBindingsForImport(documentWith(audioControl()), fixtures, async () =>
      Promise.resolve(3),
    );

    expect(remapped.pages[0]?.controls[0]?.audioBars?.[1]?.channelBindings).toEqual([
      { projectFixturePublicId: FIXTURE_ID, channelAssignmentPublicId: OTHER_ASSIGNMENT_ID },
    ]);
  });

  describe('beat bar', () => {
    const withFunction = { minThreshold: 20, functionPublicId: FUNCTION_ID };

    it.each([
      ['no function', { minThreshold: 20 }],
      ['a function', withFunction],
      ['the lowest threshold', { minThreshold: 0 }],
      ['the highest threshold', { minThreshold: 100 }],
      ['beat timing', { minThreshold: 20, timing: { fadeIn: 0, hold: 40, fadeOut: 60 } }],
      ['beat timing filling the whole gap', { minThreshold: 20, timing: { fadeIn: 10, hold: 40, fadeOut: 50 } }],
      ['all beat timing on one part', { minThreshold: 20, timing: { fadeIn: 100, hold: 0, fadeOut: 0 } }],
      ['no beat timing from GraphQL', { minThreshold: 20, timing: null as unknown as undefined }],
    ])('GIVEN a beat bar with %s WHEN validated THEN it is accepted', (_case, beatBar) => {
      expect(() => {
        assertValidVirtualConsole(documentWith(audioControl({ beatBar })));
      }).not.toThrow();
    });

    it('GIVEN no beat bar in a console saved earlier WHEN validated THEN it is accepted', () => {
      expect(() => {
        assertValidVirtualConsole(documentWith(audioControl({ beatBar: null as unknown as undefined })));
      }).not.toThrow();
    });

    it.each([
      ['a threshold above 100', { minThreshold: 101 }, 'Beat bar minThreshold'],
      ['a negative threshold', { minThreshold: -1 }, 'Beat bar minThreshold'],
      ['a fractional threshold', { minThreshold: 20.5 }, 'Beat bar minThreshold'],
      ['a function that is no UUID', { minThreshold: 20, functionPublicId: 'chase' }, 'Beat bar functionPublicId'],
      ['a timing above 100', { minThreshold: 20, timing: { fadeIn: 0, hold: 101, fadeOut: 0 } }, 'Beat bar timing'],
      ['a negative timing', { minThreshold: 20, timing: { fadeIn: -1, hold: 40, fadeOut: 60 } }, 'Beat bar timing'],
      ['a fractional timing', { minThreshold: 20, timing: { fadeIn: 0, hold: 40.5, fadeOut: 0 } }, 'Beat bar timing'],
      ['a timing over the gap', { minThreshold: 20, timing: { fadeIn: 1, hold: 40, fadeOut: 60 } }, 'Beat bar timing'],
    ])('GIVEN a beat bar with %s WHEN validated THEN it is rejected', (_case, beatBar, message) => {
      expect(() => {
        assertValidVirtualConsole(documentWith(audioControl({ beatBar })));
      }).toThrow(message);
    });

    it('GIVEN a beat bar on a button WHEN validated THEN it is rejected', () => {
      const document = validDocument();
      const button = document.pages[0]?.controls[1];
      if (button) Object.assign(button, { beatBar: { minThreshold: 20 } });

      expect(() => {
        assertValidVirtualConsole(document);
      }).toThrow('cannot have audio bars');
    });

    it('GIVEN a beat bar function outside the project WHEN checked THEN it is rejected', () => {
      expect(() => {
        assertVirtualConsoleFunctionBindings(
          documentWith(audioControl({ audioBars: [idle, idle, idle], beatBar: withFunction })),
          new Set(),
        );
      }).toThrow(FUNCTION_ID);
    });

    it('GIVEN a beat bar function WHEN exported, stripped and remapped THEN it survives by name', () => {
      const original = documentWith(audioControl({ beatBar: withFunction }));
      const exported = enrichVirtualConsoleForExport(original, [], [{ publicId: FUNCTION_ID, name: 'Chase' }]);

      expect(exported?.pages[0]?.controls[0]?.beatBar).toMatchObject({ functionName: 'Chase' });
      const stripped = exported && stripVirtualConsoleBindingHints(exported);
      expect(stripped?.pages[0]?.controls[0]?.beatBar?.functionName).toBeUndefined();
      expect(stripped?.pages[0]?.controls[0]?.beatBar?.minThreshold).toBe(20);

      const remapped =
        exported && remapVirtualConsoleFunctionsForImport(exported, [{ publicId: SLIDER_ID, name: 'Chase' }]);
      expect(remapped?.pages[0]?.controls[0]?.beatBar).toMatchObject({
        minThreshold: 20,
        functionPublicId: SLIDER_ID,
        functionName: undefined,
      });
    });

    it('GIVEN a deleted function WHEN bindings are removed THEN the beat bar keeps its threshold only', () => {
      const cleaned = removeFunctionBindings(documentWith(audioControl({ beatBar: withFunction })), FUNCTION_ID);

      expect(cleaned.pages[0]?.controls[0]?.beatBar).toMatchObject({ minThreshold: 20, functionPublicId: undefined });
    });

    it('GIVEN a deleted function with a stored name WHEN bindings are removed THEN a later import cannot rebind it', () => {
      const named = documentWith(audioControl({ beatBar: { ...withFunction, functionName: 'Chase' } }));

      const cleaned = removeFunctionBindings(named, FUNCTION_ID);
      const remapped = remapVirtualConsoleFunctionsForImport(cleaned, [{ publicId: SLIDER_ID, name: 'Chase' }]);

      expect(cleaned.pages[0]?.controls[0]?.beatBar?.functionName).toBeUndefined();
      expect(remapped.pages[0]?.controls[0]?.beatBar?.functionPublicId).toBeUndefined();
    });

    it('GIVEN a kept function with a stored name WHEN another function is deleted THEN its binding stays', () => {
      const named = documentWith(audioControl({ beatBar: { ...withFunction, functionName: 'Chase' } }));

      const cleaned = removeFunctionBindings(named, SLIDER_ID);

      expect(cleaned.pages[0]?.controls[0]?.beatBar).toMatchObject({
        functionPublicId: FUNCTION_ID,
        functionName: 'Chase',
      });
    });

    it('GIVEN a beat bar in a frame WHEN sanitized and remapped for import THEN it survives', async () => {
      const frame = {
        ...audioControl(),
        id: SLIDER_ID,
        type: VIRTUAL_CONSOLE_CONTROL_TYPE.Frame,
        bandCount: undefined,
        audioBars: undefined,
        borderWidth: 0,
        borderColor: '#000000',
        children: [audioControl({ beatBar: { minThreshold: 35, functionName: 'Chase' } })],
      };
      const sanitized = sanitizeVirtualConsoleForImport(documentWith(frame));
      const functionsMapped = remapVirtualConsoleFunctionsForImport(sanitized, [
        { publicId: FUNCTION_ID, name: 'Chase' },
      ]);

      const remapped = await remapVirtualConsoleBindingsForImport(functionsMapped, [], async () =>
        Promise.resolve(undefined),
      );

      expect(remapped.pages[0]?.controls[0]?.children?.[0]?.beatBar).toMatchObject({
        minThreshold: 35,
        functionPublicId: FUNCTION_ID,
      });
    });
  });

  it('GIVEN null bar bindings from an import WHEN sanitized THEN they are dropped', () => {
    const control = audioControl({
      bandCount: 1,
      audioBars: [idle, { ...idle, channelBindings: null as unknown as VirtualConsoleChannelBinding[] }],
    });

    const sanitized = sanitizeVirtualConsoleForImport(documentWith(control));

    expect(sanitized.pages[0]?.controls[0]?.audioBars?.[1]).toEqual(idle);
  });
});
