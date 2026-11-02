import { MidiControlType, MidiLedType, MidiMessageType } from '@/shared/types/graphql/graphql';
import { describe, expect, it } from 'vitest';
import { applyLearned, entryInput, entryValues, learnedAddress, midiAddress } from './midi-mapping-entry-values';

const trackButton1 = {
  publicId: 'entry-1',
  name: 'Track Button 1',
  controlType: MidiControlType.Button,
  messageType: MidiMessageType.Note,
  channel: 0,
  number: 100,
  feedback: { off: { behavior: 0, color: 0 }, on: { behavior: 6, color: 5 }, monitor: { behavior: 13, color: 9 } },
  ledType: MidiLedType.Single,
};

describe('midi mapping entry values', () => {
  it('GIVEN no entry WHEN creating values THEN defaults to a note button without feedback', () => {
    expect(entryValues()).toMatchObject({
      name: '',
      controlType: MidiControlType.Button,
      messageType: MidiMessageType.Note,
      hasFeedback: false,
    });
  });

  it('GIVEN an entry with feedback WHEN round-tripped THEN the input keeps it', () => {
    const { publicId: _publicId, ...expected } = trackButton1;
    expect(entryInput(entryValues(trackButton1))).toEqual(expected);
  });

  it('GIVEN feedback is switched off WHEN building the input THEN feedback is null and the name trimmed', () => {
    const values = { ...entryValues(trackButton1), name: '  Track 1 ', hasFeedback: false };
    expect(entryInput(values)).toMatchObject({ name: 'Track 1', feedback: null, ledType: null });
  });

  it('formats the address with the 0-based channel used in the form', () => {
    expect(midiAddress(trackButton1)).toBe('Note 0 / 100');
    expect(midiAddress({ messageType: MidiMessageType.ControlChange, channel: 15, number: 48 })).toBe('CC 15 / 48');
  });

  it.each([
    ['Note-On', [0x90, 0x64, 0x7f], { messageType: MidiMessageType.Note, channel: 0, number: 100 }],
    [
      'Control Change on channel 2',
      [0xb2, 48, 10],
      { messageType: MidiMessageType.ControlChange, channel: 2, number: 48 },
    ],
  ])('GIVEN %s WHEN learned THEN returns its address', (_case, message, expected) => {
    expect(learnedAddress(message)).toEqual(expected);
  });

  it.each([
    ['Note-Off', [0x80, 0x64, 0]],
    ['Note-On with velocity 0', [0x90, 0x64, 0]],
    ['pitch bend', [0xe0, 0, 64]],
    ['a truncated message', [0x90, 0x64]],
  ])('GIVEN %s WHEN learned THEN ignores it', (_case, message) => {
    expect(learnedAddress(message)).toBeUndefined();
  });

  it.each([
    ['a note on a knob', MidiControlType.Knob, MidiMessageType.Note, MidiControlType.Button],
    ['a CC on a button', MidiControlType.Button, MidiMessageType.ControlChange, MidiControlType.Slider],
    ['a CC on a knob', MidiControlType.Knob, MidiMessageType.ControlChange, MidiControlType.Knob],
  ])('GIVEN %s WHEN applied THEN the control type matches the message', (_case, current, messageType, expected) => {
    const values = { ...entryValues(), name: 'Kept', controlType: current };
    expect(applyLearned(values, { messageType, channel: 1, number: 7 })).toMatchObject({
      name: 'Kept',
      controlType: expected,
      messageType,
      channel: 1,
      number: 7,
    });
  });
});
