import {
  MidiControlType,
  MidiMessageType,
  type AddMidiMappingEntryInput,
  type MidiMappingEntryFieldsFragment,
} from '@/shared/types/graphql/graphql';

export type MidiLedStateValues = { behavior: number; color: number };

export type MidiMappingEntryValues = {
  name: string;
  controlType: MidiControlType;
  messageType: MidiMessageType;
  channel: number;
  number: number;
  hasFeedback: boolean;
  off: MidiLedStateValues;
  on: MidiLedStateValues;
};

export type MidiMappingEntryInput = Omit<AddMidiMappingEntryInput, 'midiMappingPublicId'>;

export const entryValues = (entry?: MidiMappingEntryFieldsFragment): MidiMappingEntryValues => ({
  name: entry?.name ?? '',
  controlType: entry?.controlType ?? MidiControlType.Button,
  messageType: entry?.messageType ?? MidiMessageType.Note,
  channel: entry?.channel ?? 0,
  number: entry?.number ?? 0,
  hasFeedback: Boolean(entry?.feedback),
  off: { behavior: entry?.feedback?.off.behavior ?? 0, color: entry?.feedback?.off.color ?? 0 },
  on: { behavior: entry?.feedback?.on.behavior ?? 0, color: entry?.feedback?.on.color ?? 1 },
});

export const entryInput = ({
  hasFeedback,
  off,
  on,
  name,
  ...values
}: MidiMappingEntryValues): MidiMappingEntryInput => ({
  ...values,
  name: name.trim(),
  feedback: hasFeedback ? { off, on } : null,
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
