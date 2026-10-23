import type { DmxChannelUpdate } from '@/lib/dmx/dmx-store';
import { setCellValue } from './sequence-matrix-model';
import { emptySequenceStep, newSequenceDmxValue, type SequenceStepDraft } from './sequence-steps';

export const appendCapturedStep = (
  steps: SequenceStepDraft[],
  captured: DmxChannelUpdate[],
  timingSource: SequenceStepDraft | undefined,
): SequenceStepDraft[] => [
  ...steps,
  {
    ...emptySequenceStep(),
    fadeIn: timingSource?.fadeIn ?? 0,
    hold: timingSource?.hold ?? 0,
    fadeOut: timingSource?.fadeOut ?? 0,
    dmxValues: captured.map(({ channel, value }) => newSequenceDmxValue(channel, value)),
  },
];

export const mergeCapturedIntoStep = (
  steps: SequenceStepDraft[],
  stepIndex: number,
  captured: DmxChannelUpdate[],
): SequenceStepDraft[] =>
  captured.reduce(
    (next, { channel, value }) => setCellValue(next, stepIndex, { kind: 'channel', channel, label: '' }, value),
    steps,
  );
