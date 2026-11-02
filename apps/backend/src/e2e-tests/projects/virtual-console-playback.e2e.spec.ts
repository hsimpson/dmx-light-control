import { AppEventEmitter } from '@/events/app-event-emitter';
import { createE2eApp } from '@/testhelpers/e2e-app';
import { graphqlQuery } from '@/testhelpers/graphql-test-client';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import gql from 'graphql-tag';
import type { App } from 'supertest/types';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const BUTTON_ID = '33333333-3333-4333-8333-333333333333';

const consoleWith = (controls: unknown[]) => ({
  schemaVersion: 1,
  width: 1280,
  height: 720,
  pages: [{ id: '11111111-1111-4111-8111-111111111111', name: 'Page 1', controls }],
});

const button = {
  id: BUTTON_ID,
  type: 'button',
  x: 0,
  y: 0,
  width: 80,
  height: 80,
  label: 'Flash',
  backgroundColor: '#000000',
  foregroundColor: '#ffffff',
  buttonMode: 'flash',
};

describe('Virtual console playback of the active project', () => {
  let app: NestFastifyApplication;
  let server: App;
  let states: Record<string, number>[];

  beforeAll(async () => {
    app = await createE2eApp();
    server = app.getHttpAdapter().getInstance().server;
    states = [];
    app.get(AppEventEmitter).on('virtualConsole.state', ({ values }) => {
      states.push(values);
    });
  });

  afterAll(async () => {
    await app.close();
  });

  async function createProject(name: string): Promise<string> {
    const body = await graphqlQuery<{ createProject: { publicId: string } }>(
      server,
      gql`
        mutation ($input: CreateProjectInput!) {
          createProject(input: $input) {
            publicId
          }
        }
      `,
      { variables: { input: { name } } },
    );
    const publicId = body.data?.createProject.publicId;
    if (!publicId) throw new Error(`createProject failed: ${JSON.stringify(body.errors)}`);
    return publicId;
  }

  async function mutate(mutation: string, variables: Record<string, unknown>) {
    const body = await graphqlQuery(server, mutation, { variables });
    expect(body.errors).toBeUndefined();
  }

  const press = (value: number) => {
    app.get(AppEventEmitter).emit('virtualConsole.input', { controlId: BUTTON_ID, value });
  };

  it('GIVEN the active project WHEN its console is saved, played and the project deleted THEN playback follows', async () => {
    const publicId = await createProject('VC Playback Project');
    await mutate('mutation ($publicId: UUID!) { activateProject(publicId: $publicId) { publicId } }', { publicId });

    await vi.waitFor(() => {
      expect(states.at(-1)).toEqual({});
    });
    press(1);
    expect(states.at(-1)).toEqual({});

    await mutate(
      'mutation ($input: UpdateProjectVirtualConsoleInput!) { updateProjectVirtualConsole(input: $input) { publicId } }',
      { input: { publicId, virtualConsole: consoleWith([button]) } },
    );
    await vi.waitFor(() => {
      press(1);
      expect(states.at(-1)).toEqual({ [BUTTON_ID]: 255 });
    });

    await mutate('mutation ($publicId: UUID!) { deleteProject(publicId: $publicId) { deleted } }', { publicId });
    await vi.waitFor(() => {
      expect(states.at(-1)).toEqual({});
    });
  });

  it('GIVEN a button bound to a MIDI entry with a feedback override WHEN saved THEN both are returned', async () => {
    const publicId = await createProject('VC MIDI Binding Project');
    const feedback = {
      off: { behavior: 0, color: 0 },
      on: { behavior: 6, color: 5 },
      monitor: { behavior: 13, color: 9 },
    };
    const midiEntryPublicId = '44444444-4444-4444-8444-444444444444';

    const body = await graphqlQuery<{
      updateProjectVirtualConsole: { virtualConsole: { pages: { controls: unknown[] }[] } };
    }>(
      server,
      `mutation ($input: UpdateProjectVirtualConsoleInput!) {
        updateProjectVirtualConsole(input: $input) {
          virtualConsole { pages { controls {
            midiEntryPublicId
            feedback { off { behavior color } on { behavior color } monitor { behavior color } }
          } } }
        }
      }`,
      { variables: { input: { publicId, virtualConsole: consoleWith([{ ...button, midiEntryPublicId, feedback }]) } } },
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.updateProjectVirtualConsole.virtualConsole.pages[0]?.controls).toEqual([
      { midiEntryPublicId, feedback },
    ]);
  });
});
