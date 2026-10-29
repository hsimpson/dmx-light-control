import { createE2eApp } from '@/testhelpers/e2e-app';
import { graphqlQuery } from '@/testhelpers/graphql-test-client';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import gql from 'graphql-tag';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

type Feedback = { off: { behavior: number; color: number }; on: { behavior: number; color: number } } | null;
type Entry = {
  publicId: string;
  name: string;
  controlType: string;
  messageType: string;
  channel: number;
  number: number;
  feedback: Feedback;
};
type Mapping = { publicId: string; name: string; entries: Entry[] };

const ENTRY_FIELDS =
  'publicId name controlType messageType channel number feedback { off { behavior color } on { behavior color } }';

const CREATE_MAPPING = gql`
  mutation ($input: CreateMidiMappingInput!) {
    createMidiMapping(input: $input) {
      publicId
      name
      entries {
        publicId
      }
    }
  }
`;
const ADD_ENTRY = gql`
  mutation ($input: AddMidiMappingEntryInput!) {
    addMidiMappingEntry(input: $input) { ${ENTRY_FIELDS} }
  }
`;
const UPDATE_ENTRY = gql`
  mutation ($input: UpdateMidiMappingEntryInput!) {
    updateMidiMappingEntry(input: $input) { ${ENTRY_FIELDS} }
  }
`;
const GET_MAPPING = gql`
  query ($publicId: UUID!) {
    midiMapping(publicId: $publicId) { publicId name entries { ${ENTRY_FIELDS} } }
  }
`;
const DELETE_MAPPING = gql`
  mutation ($publicId: UUID!) {
    deleteMidiMapping(publicId: $publicId) {
      deleted
    }
  }
`;

const trackButton1 = {
  name: 'Track Button 1',
  controlType: 'Button',
  messageType: 'Note',
  channel: 0,
  number: 0x64,
  feedback: { off: { behavior: 0, color: 0 }, on: { behavior: 0, color: 1 } },
};

describe('MIDI mappings', () => {
  let app: NestFastifyApplication;
  let server: Parameters<typeof graphqlQuery>[0];

  beforeAll(async () => {
    app = await createE2eApp();
    server = app.getHttpAdapter().getInstance().server;
  });

  afterAll(async () => {
    await app.close();
  });

  async function createMapping(name: string): Promise<Mapping> {
    const result = await graphqlQuery<{ createMidiMapping: Mapping }>(server, CREATE_MAPPING, {
      variables: { input: { name } },
    });
    expect(result.errors).toBeUndefined();
    const mapping = result.data?.createMidiMapping;
    if (!mapping) throw new Error('mapping not created');
    return mapping;
  }

  it('GIVEN a mapping WHEN entries are added, updated and deleted THEN the mapping reflects them', async () => {
    const mapping = await createMapping(`APC mini mk2 ${Date.now()}`);
    expect(mapping.entries).toEqual([]);

    const added = await graphqlQuery<{ addMidiMappingEntry: Entry }>(server, ADD_ENTRY, {
      variables: { input: { midiMappingPublicId: mapping.publicId, ...trackButton1 } },
    });
    expect(added.errors).toBeUndefined();
    const entry = added.data?.addMidiMappingEntry;
    expect(entry).toMatchObject(trackButton1);

    const fader = await graphqlQuery<{ addMidiMappingEntry: Entry }>(server, ADD_ENTRY, {
      variables: {
        input: {
          midiMappingPublicId: mapping.publicId,
          name: 'Fader 1',
          controlType: 'Slider',
          messageType: 'ControlChange',
          channel: 0,
          number: 48,
        },
      },
    });
    expect(fader.data?.addMidiMappingEntry.feedback).toBeNull();

    const updated = await graphqlQuery<{ updateMidiMappingEntry: Entry }>(server, UPDATE_ENTRY, {
      variables: { input: { publicId: entry?.publicId, name: '  Track 1  ', feedback: null } },
    });
    expect(updated.errors).toBeUndefined();
    expect(updated.data?.updateMidiMappingEntry).toMatchObject({ name: 'Track 1', number: 0x64, feedback: null });

    const loaded = await graphqlQuery<{ midiMapping: Mapping }>(server, GET_MAPPING, {
      variables: { publicId: mapping.publicId },
    });
    expect(loaded.data?.midiMapping.entries.map(e => e.name)).toEqual(['Track 1', 'Fader 1']);

    const deleted = await graphqlQuery<{ deleteMidiMapping: { deleted: boolean } }>(server, DELETE_MAPPING, {
      variables: { publicId: mapping.publicId },
    });
    expect(deleted.data?.deleteMidiMapping.deleted).toBe(true);
    const gone = await graphqlQuery<{ midiMapping: Mapping }>(server, GET_MAPPING, {
      variables: { publicId: mapping.publicId },
    });
    expect(gone.errors?.[0]?.extensions?.code).toBe('MIDI_MAPPING_NOT_FOUND');
  });

  it('GIVEN an existing entry WHEN another entry reuses its address THEN a conflict is returned', async () => {
    const mapping = await createMapping(`Conflict ${Date.now()}`);
    await graphqlQuery(server, ADD_ENTRY, {
      variables: { input: { midiMappingPublicId: mapping.publicId, ...trackButton1 } },
    });

    const duplicate = await graphqlQuery(server, ADD_ENTRY, {
      variables: { input: { midiMappingPublicId: mapping.publicId, ...trackButton1, name: 'Other name' } },
    });
    expect(duplicate.errors?.[0]?.extensions?.code).toBe('MIDI_MAPPING_ENTRY_CONFLICT');
  });

  it('GIVEN a mapping name WHEN it is created twice THEN a conflict is returned', async () => {
    const name = `Duplicate ${Date.now()}`;
    await createMapping(name);
    const duplicate = await graphqlQuery(server, CREATE_MAPPING, { variables: { input: { name } } });
    expect(duplicate.errors?.[0]?.extensions?.code).toBe('MIDI_MAPPING_ALREADY_EXISTS');
  });
});
