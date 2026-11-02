import { plainToInstance } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { ImportMidiMappingsInput } from './midi-mapping-import-export.dto';

const pad = {
  publicId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Pad 1',
  controlType: 'Button',
  messageType: 'Note',
  channel: 0,
  number: 0,
  feedback: { off: { behavior: 0, color: 0 }, on: { behavior: 6, color: 5 }, monitor: { behavior: 13, color: 9 } },
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

const errorPaths = (errors: ValidationError[], parent = ''): string[] =>
  errors.flatMap(error => {
    const path = parent ? `${parent}.${error.property}` : error.property;
    return error.children?.length ? errorPaths(error.children, path) : [path];
  });

async function invalidPaths(entry: object): Promise<string[]> {
  const document = { schemaVersion: 1, mappings: [{ name: 'APC', entries: [entry] }] };
  return errorPaths(await validate(plainToInstance(ImportMidiMappingsInput, document)));
}

describe('ImportMidiMappingsInput', () => {
  it('GIVEN an exported entry WHEN validated THEN valid', async () => {
    await expect(invalidPaths(pad)).resolves.toEqual([]);
  });

  it.each([
    ['a channel above 15', { channel: 16 }, 'mappings.0.entries.0.channel'],
    ['a note above 127', { number: 128 }, 'mappings.0.entries.0.number'],
    [
      'a monitor color above 127',
      { feedback: { ...pad.feedback, monitor: { behavior: 0, color: 128 } } },
      'mappings.0.entries.0.feedback.monitor.color',
    ],
    ['a non-UUID publicId', { publicId: 'x' }, 'mappings.0.entries.0.publicId'],
  ])('GIVEN %s WHEN validated THEN that field is rejected', async (_case, change, path) => {
    await expect(invalidPaths({ ...pad, ...change })).resolves.toEqual([path]);
  });
});
