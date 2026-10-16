import { ProjectFunctionType, SequenceDirection, SequenceRunOrder } from '@/shared/types/graphql/graphql';
import { describe, expect, it } from 'vitest';
import {
  draftToSequenceInput,
  functionToDraft,
  newFunctionDraft,
  type ProjectFunctionRow,
} from './project-function-mapping';

const row: ProjectFunctionRow = {
  publicId: 'fn-1',
  name: 'Chase',
  type: ProjectFunctionType.Sequence,
  sequence: {
    direction: SequenceDirection.Backward,
    runOrder: SequenceRunOrder.PingPong,
    steps: [{ fadeIn: 100, hold: 200, fadeOut: 300, dmxValues: [{ channel: 3, value: 255 }] }],
  },
};

describe('project function mapping', () => {
  it('maps a GraphQL function to a draft and back', () => {
    const draft = functionToDraft(row);
    expect(draft.name).toBe('Chase');
    expect(draft.direction).toBe('backward');
    expect(draft.runOrder).toBe('pingPong');
    expect(draft.steps[0]?.dmxValues[0]).toMatchObject({ channel: 3, value: 255 });
    expect(draftToSequenceInput(draft)).toEqual({
      direction: SequenceDirection.Backward,
      runOrder: SequenceRunOrder.PingPong,
      steps: [{ fadeIn: 100, hold: 200, fadeOut: 300, dmxValues: [{ channel: 3, value: 255 }] }],
    });
  });

  it('defaults to forward loop with one empty step', () => {
    const draft = newFunctionDraft();
    expect(draft).toMatchObject({ name: '', direction: 'forward', runOrder: 'loop' });
    expect(draft.steps).toHaveLength(1);
    expect(draft.steps[0]?.dmxValues).toEqual([]);
  });
});
