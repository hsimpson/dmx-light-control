import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { AddMidiMappingEntryInput, UpdateMidiMappingEntryInput } from './midi-mapping.dto';

const trackButton1 = {
  midiMappingPublicId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Track Button 1',
  controlType: 'Button',
  messageType: 'Note',
  channel: 0,
  number: 0x64,
  feedback: { off: { behavior: 0, color: 0 }, on: { behavior: 6, color: 127 } },
};

async function invalidProperties(input: object): Promise<string[]> {
  const errors = await validate(plainToInstance(AddMidiMappingEntryInput, input));
  return errors.map(error => error.property);
}

describe('AddMidiMappingEntryInput', () => {
  it('GIVEN MIDI values at their limits WHEN validated THEN valid', async () => {
    await expect(invalidProperties({ ...trackButton1, channel: 15, number: 127 })).resolves.toEqual([]);
    await expect(invalidProperties({ ...trackButton1, feedback: undefined })).resolves.toEqual([]);
  });

  it.each([
    ['channel above 15', { channel: 16 }, 'channel'],
    ['number above 127', { number: 128 }, 'number'],
    ['unknown control type', { controlType: 'Pad' }, 'controlType'],
    [
      'feedback behavior above 15',
      { feedback: { ...trackButton1.feedback, on: { behavior: 16, color: 1 } } },
      'feedback',
    ],
    [
      'feedback color above 127',
      { feedback: { ...trackButton1.feedback, off: { behavior: 0, color: 128 } } },
      'feedback',
    ],
  ])('GIVEN %s WHEN validated THEN rejected', async (_case, patch, property) => {
    await expect(invalidProperties({ ...trackButton1, ...patch })).resolves.toEqual([property]);
  });
});

describe('UpdateMidiMappingEntryInput', () => {
  it('GIVEN only a public id WHEN validated THEN valid', async () => {
    const input = plainToInstance(UpdateMidiMappingEntryInput, { publicId: trackButton1.midiMappingPublicId });
    await expect(validate(input)).resolves.toEqual([]);
  });
});
