import { ProjectFunctionType, SequenceDirection, SequenceRunOrder } from '@/shared/types/graphql/graphql';
import { describe, expect, it } from 'vitest';
import {
  draftToSequenceInput,
  functionToDraft,
  newFunctionDraft,
  projectSequenceFixtures,
  type ProjectFunctionRow,
} from './project-function-mapping';
import type { SequenceFixtureChannel } from './sequence-steps';

const row: ProjectFunctionRow = {
  publicId: 'fn-1',
  name: 'Chase',
  type: ProjectFunctionType.Sequence,
  sequence: {
    direction: SequenceDirection.Backward,
    runOrder: SequenceRunOrder.PingPong,
    steps: [{ fadeIn: 100, hold: 200, fadeOut: 300, dmxValues: [{ channel: 3, value: 255 }] }],
    fixturePublicIds: ['wash'],
  },
};

const fixtures: SequenceFixtureChannel[] = [
  { publicId: 'par', startAddress: 1, name: 'PAR', channels: [{ channelNumber: 3, name: 'Blue' }] },
  { publicId: 'wash', startAddress: 10, name: 'Wash', channels: [{ channelNumber: 1, name: 'Dimmer' }] },
  { publicId: 'spot', startAddress: 20, name: 'Spot', channels: [{ channelNumber: 1, name: 'Dimmer' }] },
];

describe('project function mapping', () => {
  it('maps a GraphQL function to a draft and back', () => {
    const draft = functionToDraft(row, fixtures);
    expect(draft.name).toBe('Chase');
    expect(draft.direction).toBe('backward');
    expect(draft.runOrder).toBe('pingPong');
    expect(draft.steps[0]?.dmxValues[0]).toMatchObject({ channel: 3, value: 255 });
    expect(draft.fixturePublicIds).toEqual(['wash']);
    expect(draftToSequenceInput(draft)).toEqual({
      direction: SequenceDirection.Backward,
      runOrder: SequenceRunOrder.PingPong,
      steps: [{ fadeIn: 100, hold: 200, fadeOut: 300, dmxValues: [{ channel: 3, value: 255 }] }],
      fixturePublicIds: ['wash'],
    });
  });

  it('drops stored fixtures that are no longer patched', () => {
    const stale = { ...row, sequence: row.sequence && { ...row.sequence, fixturePublicIds: ['gone', 'spot'] } };
    expect(functionToDraft(stale, fixtures).fixturePublicIds).toEqual(['spot']);
  });

  it('selects the fixtures that have values when no fixture list was stored', () => {
    const legacy = { ...row, sequence: row.sequence && { ...row.sequence, fixturePublicIds: null } };
    expect(functionToDraft(legacy, fixtures).fixturePublicIds).toEqual(['par']);
  });

  it('defaults to forward loop with one empty step and no fixtures', () => {
    const draft = newFunctionDraft();
    expect(draft).toMatchObject({ name: '', direction: 'forward', runOrder: 'loop', fixturePublicIds: [] });
    expect(draft.steps).toHaveLength(1);
    expect(draft.steps[0]?.dmxValues).toEqual([]);
    expect(draftToSequenceInput(draft)).toMatchObject({
      direction: SequenceDirection.Forward,
      runOrder: SequenceRunOrder.Loop,
    });
    expect(draftToSequenceInput({ ...draft, runOrder: 'singleShot' }).runOrder).toBe(SequenceRunOrder.SingleShot);
  });

  it('treats a function without a sequence as an empty forward loop', () => {
    const bare = { ...row, sequence: null };
    expect(functionToDraft(bare, fixtures)).toMatchObject({
      direction: 'forward',
      runOrder: 'loop',
      steps: [],
      fixturePublicIds: [],
    });
    const single = { ...row, sequence: row.sequence && { ...row.sequence, runOrder: SequenceRunOrder.SingleShot } };
    expect(functionToDraft(single, fixtures).runOrder).toBe('singleShot');
  });

  it('lists patched fixtures with their channel names', () => {
    expect(projectSequenceFixtures(null)).toEqual([]);
    expect(projectSequenceFixtures(undefined)).toEqual([]);
    expect(
      projectSequenceFixtures({
        projectFixtures: [
          {
            publicId: 'pf',
            startAddress: 1,
            fixture: { name: 'PAR' },
            channelMode: {
              fixtureChannelAssignments: [
                { channelNumber: 1, fixtureChannelDefinition: { name: 'Red', preset: null } },
              ],
            },
          },
        ],
      } as Parameters<typeof projectSequenceFixtures>[0]),
    ).toEqual([
      {
        publicId: 'pf',
        startAddress: 1,
        name: 'PAR',
        channels: [{ channelNumber: 1, name: 'Red', preset: null }],
      },
    ]);
  });
});
