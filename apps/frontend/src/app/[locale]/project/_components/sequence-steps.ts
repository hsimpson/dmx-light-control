export type SequenceDmxDraft = {
  key: string;
  channel: number;
  value: number;
};

export type SequenceStepDraft = {
  order: number;
  fadeIn: number;
  hold: number;
  fadeOut: number;
  dmxValues: SequenceDmxDraft[];
};

export const newSequenceDmxValue = (channel = 1, value = 0): SequenceDmxDraft => ({
  key: crypto.randomUUID(),
  channel,
  value,
});

export const emptySequenceStep = (order: number): SequenceStepDraft => ({
  order,
  fadeIn: 0,
  hold: 0,
  fadeOut: 0,
  dmxValues: [],
});

export const renumberSequenceSteps = (steps: SequenceStepDraft[]): SequenceStepDraft[] =>
  steps.map((step, order) => ({ ...step, order }));

export const moveSequenceStep = (
  steps: SequenceStepDraft[],
  fromIndex: number,
  toIndex: number,
): SequenceStepDraft[] => {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= steps.length || toIndex >= steps.length) {
    return steps;
  }
  const next = [...steps];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) {
    return steps;
  }
  next.splice(toIndex, 0, moved);
  return renumberSequenceSteps(next);
};
