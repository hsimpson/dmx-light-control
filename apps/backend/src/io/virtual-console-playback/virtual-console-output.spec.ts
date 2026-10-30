import type { VirtualConsoleControl } from '@/projects/virtual-console';
import { describe, expect, it } from 'vitest';
import {
  controlToDmxValue,
  dmxChannelUpdates,
  VirtualConsoleOutput,
  type VirtualConsoleBoundFixture,
} from './virtual-console-output';

const FIXTURE_ID = '55555555-5555-4555-8555-555555555555';
const OTHER_FIXTURE_ID = '88888888-8888-4888-8888-888888888888';
const RED_ID = '66666666-6666-4666-8666-666666666666';
const GREEN_ID = '77777777-7777-4777-8777-777777777777';

const fixtures: VirtualConsoleBoundFixture[] = [
  {
    publicId: FIXTURE_ID,
    startAddress: 10,
    channelMode: {
      fixtureChannelAssignments: [
        { publicId: RED_ID, channelNumber: 1 },
        { publicId: GREEN_ID, channelNumber: 2 },
      ],
    },
  },
  {
    publicId: OTHER_FIXTURE_ID,
    startAddress: 20,
    channelMode: { fixtureChannelAssignments: [{ publicId: RED_ID, channelNumber: 1 }] },
  },
];

let nextId = 0;
const control = (
  type: VirtualConsoleControl['type'],
  overrides: Partial<VirtualConsoleControl> = {},
): VirtualConsoleControl => ({
  id: `control-${++nextId}`,
  type,
  x: 0,
  y: 0,
  width: 80,
  height: 80,
  label: type,
  backgroundColor: '#000000',
  ...overrides,
});

const binding = (projectFixturePublicId: string, channelAssignmentPublicId: string) => ({
  projectFixturePublicId,
  channelAssignmentPublicId,
});

describe('virtual console output', () => {
  it('GIVEN a percentage slider WHEN scaled THEN maps onto its limits and fans out across bound channels', () => {
    const slider = control('slider', {
      valueType: 'percentage',
      channelBindings: [binding(FIXTURE_ID, RED_ID), binding(FIXTURE_ID, GREEN_ID), binding(OTHER_FIXTURE_ID, RED_ID)],
    });

    expect(controlToDmxValue(slider, 50)).toBe(128);
    expect(controlToDmxValue({ ...slider, lowerLimit: null, upperLimit: null }, 50)).toBe(128);
    expect(controlToDmxValue({ ...slider, lowerLimit: 10, upperLimit: 110 }, 0)).toBe(10);
    expect(controlToDmxValue({ ...slider, lowerLimit: 10, upperLimit: 110 }, 50)).toBe(60);
    expect(controlToDmxValue({ ...slider, lowerLimit: 10, upperLimit: 110 }, 100)).toBe(110);
    expect(dmxChannelUpdates(slider, 100, fixtures)).toEqual([
      { channel: 10, value: 255 },
      { channel: 11, value: 255 },
      { channel: 20, value: 255 },
    ]);
  });

  it('GIVEN a dmx slider WHEN a binding no longer resolves THEN passes the value through for the rest', () => {
    const slider = control('slider', {
      channelBindings: [binding(FIXTURE_ID, RED_ID), binding(FIXTURE_ID, '99999999-9999-4999-8999-999999999999')],
    });

    expect(dmxChannelUpdates(slider, 40, fixtures)).toEqual([{ channel: 10, value: 40 }]);
  });

  it('GIVEN a fixture patched past the universe WHEN resolved THEN the channel is skipped', () => {
    const slider = control('slider', { channelBindings: [binding(FIXTURE_ID, GREEN_ID)] });

    const patchedAtEnd = {
      publicId: FIXTURE_ID,
      startAddress: 512,
      channelMode: { fixtureChannelAssignments: [{ publicId: GREEN_ID, channelNumber: 2 }] },
    };

    expect(dmxChannelUpdates(slider, 40, [patchedAtEnd])).toEqual([]);
  });

  it('GIVEN a button WHEN pressed and released THEN writes only its bound channels', () => {
    const output = new VirtualConsoleOutput();
    const button = control('button', { channelBindings: [binding(FIXTURE_ID, GREEN_ID)] });

    expect(output.apply(button, 255, fixtures)).toEqual([{ channel: 11, value: 255 }]);
    expect(output.apply(button, 0, fixtures)).toEqual([{ channel: 11, value: 0 }]);
  });

  it('GIVEN a slider level WHEN a button on the same channel is released THEN the slider level returns', () => {
    const output = new VirtualConsoleOutput();
    const slider = control('slider', { channelBindings: [binding(FIXTURE_ID, RED_ID)] });
    const button = control('button', { channelBindings: [binding(FIXTURE_ID, RED_ID), binding(FIXTURE_ID, GREEN_ID)] });

    output.apply(slider, 100, fixtures);
    output.apply(button, 255, fixtures);

    expect(output.apply(button, 0, fixtures)).toEqual([
      { channel: 10, value: 100 },
      { channel: 11, value: 0 },
    ]);
  });

  it('GIVEN another held button on the channel WHEN one is released THEN the channel stays full', () => {
    const output = new VirtualConsoleOutput();
    const held = control('button', { channelBindings: [binding(FIXTURE_ID, RED_ID)] });
    const released = control('button', { channelBindings: [binding(FIXTURE_ID, RED_ID)] });

    output.apply(held, 255, fixtures);
    output.apply(released, 255, fixtures);

    expect(output.apply(released, 0, fixtures)).toEqual([{ channel: 10, value: 255 }]);
  });

  it('GIVEN no resolvable channels WHEN applied THEN nothing is written', () => {
    expect(new VirtualConsoleOutput().apply(control('slider'), 10, fixtures)).toEqual([]);
  });
});
