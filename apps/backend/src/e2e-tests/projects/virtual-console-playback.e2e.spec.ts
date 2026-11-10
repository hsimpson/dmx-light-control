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

  describe('MIDI device scope', () => {
    const midiEntryPublicId = '44444444-4444-4444-8444-444444444444';
    const SAVE_SCOPE = `mutation ($input: UpdateProjectVirtualConsoleInput!) {
      updateProjectVirtualConsole(input: $input) {
        virtualConsole { pages { controls { midiDeviceSerials } } }
      }
    }`;
    const saveScope = async (publicId: string, midiDeviceSerials: unknown) =>
      graphqlQuery<{
        updateProjectVirtualConsole: { virtualConsole: { pages: { controls: unknown[] }[] } };
      }>(server, SAVE_SCOPE, {
        variables: {
          input: { publicId, virtualConsole: consoleWith([{ ...button, midiEntryPublicId, midiDeviceSerials }]) },
        },
      });

    it('GIVEN a scoped control WHEN saved, exported and re-imported THEN the scope round-trips', async () => {
      const publicId = await createProject('VC MIDI Scope Project');
      const saved = await saveScope(publicId, ['25082560709810']);

      const exported = await graphqlQuery<{
        exportProjects: {
          projects: { publicId: string; virtualConsole: { pages: { controls: unknown[] }[] } }[];
        };
      }>(
        server,
        `query { exportProjects { projects { publicId virtualConsole { pages { controls { midiDeviceSerials } } } } } }`,
      );
      const imported = await graphqlQuery<{ importProjects: { importedCount: number } }>(
        server,
        `mutation ($document: ImportProjectsInput!) { importProjects(document: $document) { importedCount } }`,
        {
          variables: {
            document: {
              schemaVersion: 13,
              projects: [
                {
                  publicId,
                  name: 'VC MIDI Scope Project',
                  virtualConsole: consoleWith([
                    { ...button, midiEntryPublicId, midiDeviceSerials: ['26062560878750'] },
                  ]),
                },
              ],
            },
          },
        },
      );
      const reloaded = await graphqlQuery<{ project: { virtualConsole: { pages: { controls: unknown[] }[] } } }>(
        server,
        `query ($publicId: UUID!) { project(publicId: $publicId) { virtualConsole { pages { controls { midiDeviceSerials } } } } }`,
        { variables: { publicId } },
      );

      expect(saved.errors).toBeUndefined();
      expect(saved.data?.updateProjectVirtualConsole.virtualConsole.pages[0]?.controls).toEqual([
        { midiDeviceSerials: ['25082560709810'] },
      ]);
      expect(
        exported.data?.exportProjects.projects.find(project => project.publicId === publicId)?.virtualConsole.pages[0]
          ?.controls,
      ).toEqual([{ midiDeviceSerials: ['25082560709810'] }]);
      expect(imported.errors).toBeUndefined();
      expect(reloaded.data?.project.virtualConsole.pages[0]?.controls).toEqual([
        { midiDeviceSerials: ['26062560878750'] },
      ]);
    });

    it.each([
      ['too many serials', Array.from({ length: 33 }, (_, index) => `serial-${index}`)],
      ['an over-long serial', ['x'.repeat(256)]],
      ['an empty serial', ['']],
    ])('GIVEN %s WHEN saved THEN the input is rejected', async (_case, midiDeviceSerials) => {
      const publicId = await createProject(`VC MIDI Scope Invalid ${_case}`);

      const body = await saveScope(publicId, midiDeviceSerials);

      expect(body.errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT');
    });
  });

  describe('audio triggers', () => {
    const saveAudioTriggers = async (audioBars: unknown[]) =>
      graphqlQuery<{ updateProjectVirtualConsole: { virtualConsole: { pages: { controls: unknown[] }[] } } }>(
        server,
        `mutation ($input: UpdateProjectVirtualConsoleInput!) {
          updateProjectVirtualConsole(input: $input) {
            virtualConsole { pages { controls { type bandCount audioBars { mode minThreshold maxThreshold functionPublicId } } } }
          }
        }`,
        {
          variables: {
            input: {
              publicId: await createProject(`VC Audio ${audioBars.length}`),
              virtualConsole: consoleWith([
                { ...button, buttonMode: undefined, type: 'audioTriggers', bandCount: audioBars.length - 1, audioBars },
              ]),
            },
          },
        },
      );

    it('GIVEN a volume bar and two bands WHEN saved THEN they are returned', async () => {
      const audioBars = [
        { mode: 'function', minThreshold: 20, maxThreshold: 80, functionPublicId: null },
        { mode: 'none', minThreshold: 10, maxThreshold: 90, functionPublicId: null },
        { mode: 'channels', minThreshold: 0, maxThreshold: 100, functionPublicId: null },
      ];

      const body = await saveAudioTriggers(audioBars);

      expect(body.errors).toBeUndefined();
      expect(body.data?.updateProjectVirtualConsole.virtualConsole.pages[0]?.controls).toEqual([
        { type: 'audioTriggers', bandCount: 2, audioBars },
      ]);
    });

    it('GIVEN a bar whose min threshold is not below its max WHEN saved THEN the console is rejected', async () => {
      const body = await saveAudioTriggers([
        { mode: 'none', minThreshold: 20, maxThreshold: 80 },
        { mode: 'none', minThreshold: 60, maxThreshold: 60 },
      ]);

      expect(body.errors?.[0]?.message).toContain('minThreshold must be less than maxThreshold');
    });

    const saveBeatBar = async (beatBar: unknown) =>
      graphqlQuery<{ updateProjectVirtualConsole: { virtualConsole: { pages: { controls: unknown[] }[] } } }>(
        server,
        `mutation ($input: UpdateProjectVirtualConsoleInput!) {
          updateProjectVirtualConsole(input: $input) {
            virtualConsole { pages { controls { beatBar { minThreshold functionPublicId timing { fadeIn hold fadeOut } } } } }
          }
        }`,
        {
          variables: {
            input: {
              publicId: await createProject(`VC Beat ${JSON.stringify(beatBar)}`),
              virtualConsole: consoleWith([
                {
                  ...button,
                  buttonMode: undefined,
                  type: 'audioTriggers',
                  bandCount: 1,
                  audioBars: [
                    { mode: 'none', minThreshold: 20, maxThreshold: 80 },
                    { mode: 'none', minThreshold: 20, maxThreshold: 80 },
                  ],
                  beatBar,
                },
              ]),
            },
          },
        },
      );

    it('GIVEN a beat bar WHEN saved THEN it is returned', async () => {
      const body = await saveBeatBar({ minThreshold: 35 });

      expect(body.errors).toBeUndefined();
      expect(body.data?.updateProjectVirtualConsole.virtualConsole.pages[0]?.controls).toEqual([
        { beatBar: { minThreshold: 35, functionPublicId: null, timing: null } },
      ]);
    });

    it('GIVEN a beat bar with beat timing WHEN saved THEN it is returned', async () => {
      const timing = { fadeIn: 0, hold: 40, fadeOut: 60 };

      const body = await saveBeatBar({ minThreshold: 35, timing });

      expect(body.errors).toBeUndefined();
      expect(body.data?.updateProjectVirtualConsole.virtualConsole.pages[0]?.controls).toEqual([
        { beatBar: { minThreshold: 35, functionPublicId: null, timing } },
      ]);
    });

    it.each([
      ['a field above 100', { fadeIn: 0, hold: 101, fadeOut: 0 }, 'BAD_USER_INPUT'],
      ['a total above 100', { fadeIn: 1, hold: 40, fadeOut: 60 }, 'INVALID_VIRTUAL_CONSOLE'],
    ])('GIVEN beat timing with %s WHEN saved THEN it is rejected', async (_case, timing, code) => {
      const body = await saveBeatBar({ minThreshold: 35, timing });

      expect(body.errors?.[0]?.extensions?.code).toBe(code);
    });

    it('GIVEN a beat bar threshold above 100 WHEN saved THEN it is rejected as bad input', async () => {
      const body = await saveBeatBar({ minThreshold: 101 });

      expect(body.errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT');
    });

    it('GIVEN a beat bar function from outside the project WHEN saved THEN it is rejected', async () => {
      const body = await saveBeatBar({ minThreshold: 20, functionPublicId: '44444444-4444-4444-8444-444444444444' });

      expect(body.errors?.[0]?.message).toContain('does not belong to this project');
    });
  });
});
