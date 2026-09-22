import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createControl } from './virtual-console-document';
import {
  controlToDmxValue,
  dmxChannelUpdates,
  publishVirtualConsoleValue,
  type VirtualConsoleBoundFixture,
} from './virtual-console-channel-output';

const setChannels = vi.fn();

vi.mock('@/lib/dmx/dmx-socket-connector', () => ({
  getDmxWebsocketClient: () => ({ setChannels }),
}));

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
    channelMode: {
      fixtureChannelAssignments: [{ publicId: RED_ID, channelNumber: 1 }],
    },
  },
];

describe('virtual console channel output', () => {
  beforeEach(() => {
    setChannels.mockClear();
  });

  it('maps percentage sliders onto 0-255 and fans one value across bound channels', () => {
    const control = {
      ...createControl('slider', 0, 0),
      valueType: 'percentage' as const,
      channelBindings: [
        { projectFixturePublicId: FIXTURE_ID, channelAssignmentPublicId: RED_ID },
        { projectFixturePublicId: FIXTURE_ID, channelAssignmentPublicId: GREEN_ID },
        { projectFixturePublicId: OTHER_FIXTURE_ID, channelAssignmentPublicId: RED_ID },
      ],
    };
    expect(controlToDmxValue(control, 50)).toBe(128);
    expect(dmxChannelUpdates(control, 100, fixtures)).toEqual([
      { channel: 10, value: 255 },
      { channel: 11, value: 255 },
      { channel: 20, value: 255 },
    ]);
  });

  it('passes a dmx slider value through and skips bindings that no longer resolve', () => {
    const control = {
      ...createControl('slider', 0, 0),
      channelBindings: [
        { projectFixturePublicId: FIXTURE_ID, channelAssignmentPublicId: RED_ID },
        { projectFixturePublicId: FIXTURE_ID, channelAssignmentPublicId: '99999999-9999-4999-8999-999999999999' },
      ],
    };
    expect(dmxChannelUpdates(control, 40, fixtures)).toEqual([{ channel: 10, value: 40 }]);
  });

  it('writes button press and release values only for bound channels', () => {
    const control = {
      ...createControl('button', 0, 0),
      channelBindings: [{ projectFixturePublicId: FIXTURE_ID, channelAssignmentPublicId: GREEN_ID }],
    };
    publishVirtualConsoleValue(control, 255, fixtures);
    expect(setChannels).toHaveBeenCalledWith([{ channel: 11, value: 255 }]);
    publishVirtualConsoleValue(control, 0, fixtures);
    expect(setChannels).toHaveBeenLastCalledWith([{ channel: 11, value: 0 }]);
  });

  it('does not write when the control has no resolvable channels', () => {
    publishVirtualConsoleValue(createControl('slider', 0, 0), 10, fixtures);
    expect(setChannels).not.toHaveBeenCalled();
  });
});
