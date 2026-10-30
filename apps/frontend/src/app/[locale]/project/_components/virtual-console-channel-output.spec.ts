import { describe, expect, it } from 'vitest';
import { createControl } from './virtual-console-document';
import { virtualConsoleBoundChannels, type VirtualConsoleBoundFixture } from './virtual-console-channel-output';

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
  it('lists every channel bound on the console, including nested controls', () => {
    const nested = {
      ...createControl('slider', 0, 0),
      channelBindings: [{ projectFixturePublicId: OTHER_FIXTURE_ID, channelAssignmentPublicId: RED_ID }],
    };
    const frame = {
      ...createControl('frame', 0, 0),
      children: [
        {
          ...createControl('slider', 0, 0),
          channelBindings: [
            { projectFixturePublicId: FIXTURE_ID, channelAssignmentPublicId: GREEN_ID },
            { projectFixturePublicId: FIXTURE_ID, channelAssignmentPublicId: RED_ID },
          ],
          children: [nested],
        },
      ],
    };
    expect(virtualConsoleBoundChannels([{ controls: [frame] }], fixtures)).toEqual([10, 11, 20]);
    expect(virtualConsoleBoundChannels(undefined, fixtures)).toEqual([]);
  });
});
