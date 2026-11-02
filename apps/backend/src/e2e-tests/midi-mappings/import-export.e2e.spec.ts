import { AppEventEmitter } from '@/events/app-event-emitter';
import { createE2eApp } from '@/testhelpers/e2e-app';
import { graphqlQuery } from '@/testhelpers/graphql-test-client';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const MAPPING_ID = '0a000000-0000-4000-8000-000000000001';
const PAD_ID = '0a000000-0000-4000-8000-000000000002';
const FADER_ID = '0a000000-0000-4000-8000-000000000003';

const FEEDBACK = 'feedback { off { behavior color } on { behavior color } monitor { behavior color } }';
const PALETTE = 'behaviors { name value hex } colors { name value hex }';
const MAPPING_FIELDS = `publicId name ledPalettes { rgb { ${PALETTE} } single { ${PALETTE} } } entries { publicId name controlType messageType channel number ledType ${FEEDBACK} }`;

const EXPORT = `query { exportMidiMappings { schemaVersion mappings { ${MAPPING_FIELDS} createdAt updatedAt } } }`;
const IMPORT = `mutation ($document: ImportMidiMappingsInput!) {
  importMidiMappings(document: $document) { importedCount mappings { ${MAPPING_FIELDS} } }
}`;
const MAPPING = `query ($publicId: UUID!) { midiMapping(publicId: $publicId) { ${MAPPING_FIELDS} } }`;

const pad = {
  publicId: PAD_ID,
  name: 'Pad 1',
  controlType: 'Button',
  messageType: 'Note',
  channel: 0,
  number: 0,
  feedback: { off: { behavior: 0, color: 0 }, on: { behavior: 6, color: 5 }, monitor: { behavior: 13, color: 9 } },
  ledType: 'Rgb',
};
const ledPalettes = {
  rgb: {
    behaviors: [{ name: 'Solid 100 %', value: 6, hex: null }],
    colors: [{ name: 'Red', value: 5, hex: '#FF0000' }],
  },
  single: null,
};
const fader = {
  publicId: FADER_ID,
  name: 'Fader 1',
  controlType: 'Slider',
  messageType: 'ControlChange',
  channel: 0,
  number: 48,
  feedback: null,
  ledType: null,
};

type Mapping = { publicId: string; name: string; ledPalettes?: unknown; entries: unknown[] };

describe('MIDI mapping import/export', () => {
  let app: NestFastifyApplication;
  let server: Parameters<typeof graphqlQuery>[0];

  beforeAll(async () => {
    app = await createE2eApp();
    server = app.getHttpAdapter().getInstance().server;
  });

  afterAll(async () => {
    await app.close();
  });

  const importDocument = async (mappings: unknown[], schemaVersion = 1) =>
    graphqlQuery<{ importMidiMappings: { importedCount: number; mappings: Mapping[] } }>(server, IMPORT, {
      variables: { document: { schemaVersion, mappings } },
    });

  const storedMapping = async (publicId: string) =>
    (await graphqlQuery<{ midiMapping: Mapping }>(server, MAPPING, { variables: { publicId } })).data?.midiMapping;

  it('GIVEN a new mapping WHEN imported THEN it is created with its publicIds and exported again', async () => {
    const changed = vi.fn();
    app.get(AppEventEmitter).on('midiMapping.changed', changed);

    const imported = await importDocument([
      { publicId: MAPPING_ID, name: 'Imported APC', ledPalettes, entries: [pad, fader] },
    ]);
    const exported = await graphqlQuery<{ exportMidiMappings: { schemaVersion: number; mappings: Mapping[] } }>(
      server,
      EXPORT,
    );

    expect(imported.errors).toBeUndefined();
    expect(imported.data?.importMidiMappings).toEqual({
      importedCount: 1,
      mappings: [{ publicId: MAPPING_ID, name: 'Imported APC', ledPalettes, entries: [pad, fader] }],
    });
    expect(exported.data?.exportMidiMappings.schemaVersion).toBe(1);
    expect(exported.data?.exportMidiMappings.mappings).toContainEqual(
      expect.objectContaining({ publicId: MAPPING_ID, name: 'Imported APC', entries: [pad, fader] }),
    );
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it('GIVEN an existing mapping WHEN re-imported without palettes THEN it is renamed, entries replaced, palettes kept', async () => {
    await importDocument([{ publicId: MAPPING_ID, name: 'Imported APC', ledPalettes, entries: [pad, fader] }]);

    const body = await importDocument([
      { publicId: MAPPING_ID, name: 'Renamed APC', entries: [{ ...pad, name: 'Pad A', number: 1 }] },
    ]);

    expect(body.errors).toBeUndefined();
    await expect(storedMapping(MAPPING_ID)).resolves.toEqual({
      publicId: MAPPING_ID,
      name: 'Renamed APC',
      ledPalettes,
      entries: [{ ...pad, name: 'Pad A', number: 1 }],
    });
  });

  it('GIVEN a publicId and a name that match different mappings WHEN imported THEN conflict and nothing changes', async () => {
    await importDocument([{ publicId: MAPPING_ID, name: 'Imported APC', entries: [pad] }]);
    await importDocument([{ name: 'Other controller', entries: [] }]);

    const body = await importDocument([{ publicId: MAPPING_ID, name: 'Other controller', entries: [] }]);

    expect(body.errors?.[0]?.extensions?.code).toBe('MIDI_MAPPING_IMPORT_CONFLICT');
    expect((await storedMapping(MAPPING_ID))?.entries).toEqual([pad]);
  });

  it('GIVEN a file with a duplicate address WHEN imported THEN the whole import is rolled back', async () => {
    await importDocument([{ publicId: MAPPING_ID, name: 'Imported APC', entries: [pad] }]);

    const body = await importDocument([
      { name: 'Rolled back controller', entries: [] },
      { publicId: MAPPING_ID, name: 'Imported APC', entries: [fader, { ...fader, publicId: undefined, name: 'Copy' }] },
    ]);
    const exported = await graphqlQuery<{ exportMidiMappings: { mappings: Mapping[] } }>(server, EXPORT);

    expect(body.errors?.[0]?.extensions?.code).toBe('MIDI_MAPPING_IMPORT_CONFLICT');
    expect((await storedMapping(MAPPING_ID))?.entries).toEqual([pad]);
    expect(exported.data?.exportMidiMappings.mappings.map(mapping => mapping.name)).not.toContain(
      'Rolled back controller',
    );
  });

  it('GIVEN an unknown schemaVersion WHEN imported THEN MIDI_MAPPING_IMPORT_INVALID', async () => {
    const body = await importDocument([], 99);

    expect(body.errors?.[0]?.extensions?.code).toBe('MIDI_MAPPING_IMPORT_INVALID');
  });
});
