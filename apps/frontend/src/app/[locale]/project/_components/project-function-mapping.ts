import { type GetProjectQuery, SequenceDirection, SequenceRunOrder } from '@/shared/types/graphql/graphql';
import {
  emptySequenceStep,
  fixtureAbsoluteChannels,
  newSequenceDmxValue,
  type SequenceFixtureChannel,
  type SequenceStepDraft,
} from './sequence-steps';

type ProjectDetail = NonNullable<GetProjectQuery['project']>;

export type ProjectFunctionRow = ProjectDetail['projectFunctions'][number];

export type ProjectFunctionDraft = {
  name: string;
  direction: 'forward' | 'backward';
  runOrder: 'loop' | 'singleShot' | 'pingPong';
  steps: SequenceStepDraft[];
  fixturePublicIds: string[];
};

export const newFunctionDraft = (): ProjectFunctionDraft => ({
  name: '',
  direction: 'forward',
  runOrder: 'loop',
  steps: [emptySequenceStep()],
  fixturePublicIds: [],
});

const directionToEnum = (direction: ProjectFunctionDraft['direction']) =>
  direction === 'backward' ? SequenceDirection.Backward : SequenceDirection.Forward;

const runOrderToEnum = (runOrder: ProjectFunctionDraft['runOrder']) => {
  switch (runOrder) {
    case 'singleShot':
      return SequenceRunOrder.SingleShot;
    case 'pingPong':
      return SequenceRunOrder.PingPong;
    case 'loop':
      return SequenceRunOrder.Loop;
  }
};

const draftFixturePublicIds = (fn: ProjectFunctionRow, fixtures: SequenceFixtureChannel[]): string[] => {
  const stored = fn.sequence?.fixturePublicIds;
  const used = new Set(fn.sequence?.steps.flatMap(step => step.dmxValues.map(entry => entry.channel)) ?? []);
  return fixtures
    .filter(fixture =>
      stored ? stored.includes(fixture.publicId) : fixtureAbsoluteChannels(fixture).some(channel => used.has(channel)),
    )
    .map(fixture => fixture.publicId);
};

export const functionToDraft = (fn: ProjectFunctionRow, fixtures: SequenceFixtureChannel[]): ProjectFunctionDraft => ({
  name: fn.name,
  direction: fn.sequence?.direction === SequenceDirection.Backward ? 'backward' : 'forward',
  runOrder:
    fn.sequence?.runOrder === SequenceRunOrder.SingleShot
      ? 'singleShot'
      : fn.sequence?.runOrder === SequenceRunOrder.PingPong
        ? 'pingPong'
        : 'loop',
  steps: (fn.sequence?.steps ?? []).map(step => ({
    key: crypto.randomUUID(),
    fadeIn: step.fadeIn,
    hold: step.hold,
    fadeOut: step.fadeOut,
    dmxValues: step.dmxValues.map(entry => newSequenceDmxValue(entry.channel, entry.value)),
  })),
  fixturePublicIds: draftFixturePublicIds(fn, fixtures),
});

export const draftToSequenceInput = (draft: ProjectFunctionDraft) => ({
  direction: directionToEnum(draft.direction),
  runOrder: runOrderToEnum(draft.runOrder),
  steps: draft.steps.map(step => ({
    fadeIn: step.fadeIn,
    hold: step.hold,
    fadeOut: step.fadeOut,
    dmxValues: step.dmxValues.map(({ channel, value }) => ({ channel, value })),
  })),
  fixturePublicIds: draft.fixturePublicIds,
});

export const projectSequenceFixtures = (
  project: Pick<ProjectDetail, 'projectFixtures'> | null | undefined,
): SequenceFixtureChannel[] =>
  (project?.projectFixtures ?? []).map(fixture => ({
    publicId: fixture.publicId,
    startAddress: fixture.startAddress,
    name: fixture.fixture.name,
    channels: fixture.channelMode.fixtureChannelAssignments.map(assignment => ({
      channelNumber: assignment.channelNumber,
      name: assignment.fixtureChannelDefinition.name,
      preset: assignment.fixtureChannelDefinition.preset,
    })),
  }));
