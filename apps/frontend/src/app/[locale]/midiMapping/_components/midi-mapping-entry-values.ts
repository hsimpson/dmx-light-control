import {
  MidiControlType,
  MidiLedType,
  MidiMessageType,
  type AddMidiMappingEntryInput,
  type MidiMappingEntryFieldsFragment,
} from '@/shared/types/graphql/graphql';

export type MidiLedStateValues = { behavior: number; color: number };

export type MidiFeedbackValues = {
  off: MidiLedStateValues;
  on: MidiLedStateValues;
  monitor: MidiLedStateValues | null;
};

type MidiFeedbackLike = {
  off: MidiLedStateValues;
  on: MidiLedStateValues;
  monitor?: MidiLedStateValues | null;
} | null;

/** Copies only the LED fields, dropping GraphQL `__typename`, so the result can be sent back as input. */
export const feedbackValues = (feedback: MidiFeedbackLike | undefined): MidiFeedbackValues => ({
  off: { behavior: feedback?.off.behavior ?? 0, color: feedback?.off.color ?? 0 },
  on: { behavior: feedback?.on.behavior ?? 0, color: feedback?.on.color ?? 1 },
  monitor: feedback?.monitor ? { behavior: feedback.monitor.behavior, color: feedback.monitor.color } : null,
});

export type MidiMappingEntryValues = {
  name: string;
  controlType: MidiControlType;
  messageType: MidiMessageType;
  channel: number;
  number: number;
  hasFeedback: boolean;
  feedback: MidiFeedbackValues;
  ledType: MidiLedType;
};

export type MidiMappingEntryInput = Omit<AddMidiMappingEntryInput, 'midiMappingPublicId'>;

export const entryValues = (entry?: MidiMappingEntryFieldsFragment): MidiMappingEntryValues => ({
  name: entry?.name ?? '',
  controlType: entry?.controlType ?? MidiControlType.Button,
  messageType: entry?.messageType ?? MidiMessageType.Note,
  channel: entry?.channel ?? 0,
  number: entry?.number ?? 0,
  hasFeedback: Boolean(entry?.feedback),
  feedback: feedbackValues(entry?.feedback),
  ledType: entry?.ledType ?? MidiLedType.Rgb,
});

export const entryInput = ({
  hasFeedback,
  feedback,
  ledType,
  name,
  ...values
}: MidiMappingEntryValues): MidiMappingEntryInput => ({
  ...values,
  name: name.trim(),
  feedback: hasFeedback ? feedback : null,
  ledType: hasFeedback ? ledType : null,
});

export const midiAddress = ({
  messageType,
  channel,
  number,
}: Pick<MidiMappingEntryValues, 'messageType' | 'channel' | 'number'>) =>
  `${messageType === MidiMessageType.Note ? 'Note' : 'CC'} ${channel} / ${number}`;

const NOTE_ON = 0x90;
const CONTROL_CHANGE = 0xb0;

type MidiAddress = Pick<MidiMappingEntryValues, 'messageType' | 'channel' | 'number'>;

/** Note-On (velocity > 0) or Control Change; Note-Off and release messages are ignored so a press is learned once. */
export const learnedAddress = (message: readonly number[]): MidiAddress | undefined => {
  const [status, number, value] = message;
  if (status === undefined || number === undefined || value === undefined) {
    return undefined;
  }
  const kind = status & 0xf0;
  const channel = status & 0x0f;
  if (kind === NOTE_ON && value > 0) {
    return { messageType: MidiMessageType.Note, channel, number };
  }
  if (kind === CONTROL_CHANGE) {
    return { messageType: MidiMessageType.ControlChange, channel, number };
  }
  return undefined;
};

/** Notes are buttons; a CC keeps a chosen knob/slider and only replaces a button. */
export const applyLearned = (values: MidiMappingEntryValues, address: MidiAddress): MidiMappingEntryValues => {
  const controlType =
    address.messageType === MidiMessageType.Note
      ? MidiControlType.Button
      : values.controlType === MidiControlType.Button
        ? MidiControlType.Slider
        : values.controlType;
  return { ...values, ...address, controlType };
};
