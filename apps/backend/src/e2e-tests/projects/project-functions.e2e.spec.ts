import { handleDmxWebsocketConnection, type DmxWsSocket } from '@/io/dmx/dmx-websocket.connection';
import { DmxUniverseService } from '@/io/dmx/dmx-universe.service';
import { createE2eApp } from '@/testhelpers/e2e-app';
import { graphqlQuery } from '@/testhelpers/graphql-test-client';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import gql from 'graphql-tag';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

type CreateProjectMutation = { createProject: { publicId: string } };
type AddFunctionMutation = {
  addProjectFunction: {
    publicId: string;
    name: string;
    type: string;
    sequence: { direction: string; steps: { order: number }[] };
  };
};
type ProjectQuery = { project: { projectFunctions: { name: string; sequence: { runOrder: string } }[] } | null };

class FakeSocket implements DmxWsSocket {
  public readonly OPEN = 1;
  public readyState = 1;
  public readonly sent: string[] = [];
  private readonly listeners = new Map<string, (raw: Buffer | string) => void>();

  public send(data: string): void {
    this.sent.push(data);
  }

  public on(event: 'message' | 'close', listener: (raw: Buffer | string) => void): void {
    this.listeners.set(event, listener);
  }

  public emit(event: 'message' | 'close', raw?: Buffer | string): void {
    this.listeners.get(event)?.(raw ?? Buffer.from(''));
  }

  public close(): void {
    this.readyState = 3;
  }
}

describe('Project functions', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createE2eApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates, updates, deletes a sequence and plays it from the DMX socket', async () => {
    const server = app.getHttpAdapter().getInstance().server;
    const created = await graphqlQuery<CreateProjectMutation>(
      server,
      gql`
        mutation ($input: CreateProjectInput!) {
          createProject(input: $input) {
            publicId
          }
        }
      `,
      { variables: { input: { name: `Functions ${Date.now()}` } } },
    );
    expect(created.errors).toBeUndefined();
    const projectPublicId = created.data?.createProject.publicId;
    expect(projectPublicId).toBeTruthy();

    const added = await graphqlQuery<AddFunctionMutation>(
      server,
      gql`
        mutation ($input: AddProjectFunctionInput!) {
          addProjectFunction(input: $input) {
            publicId
            name
            type
            sequence {
              direction
              steps {
                order
              }
            }
          }
        }
      `,
      {
        variables: {
          input: {
            projectPublicId,
            name: 'Chase',
            type: 'Sequence',
            sequence: {
              direction: 'Forward',
              runOrder: 'Loop',
              steps: [{ order: 0, fadeIn: 0, hold: 5000, fadeOut: 0, dmxValues: [{ channel: 7, value: 200 }] }],
            },
          },
        },
      },
    );
    expect(added.errors).toBeUndefined();
    const functionPublicId = added.data?.addProjectFunction.publicId;
    expect(added.data?.addProjectFunction.sequence.direction).toBe('Forward');

    const updated = await graphqlQuery<{ updateProjectFunction: { sequence: { runOrder: string } } }>(
      server,
      gql`
        mutation ($input: UpdateProjectFunctionInput!) {
          updateProjectFunction(input: $input) {
            sequence {
              runOrder
            }
          }
        }
      `,
      {
        variables: {
          input: {
            publicId: functionPublicId,
            sequence: {
              direction: 'Backward',
              runOrder: 'SingleShot',
              steps: [{ order: 0, fadeIn: 0, hold: 5000, fadeOut: 0, dmxValues: [{ channel: 7, value: 180 }] }],
            },
          },
        },
      },
    );
    expect(updated.errors).toBeUndefined();
    expect(updated.data?.updateProjectFunction.sequence.runOrder).toBe('SingleShot');

    const loaded = await graphqlQuery<ProjectQuery>(
      server,
      gql`
        query ($publicId: UUID!) {
          project(publicId: $publicId) {
            projectFunctions {
              name
              sequence {
                runOrder
              }
            }
          }
        }
      `,
      { variables: { publicId: projectPublicId } },
    );
    expect(loaded.data?.project?.projectFunctions[0]?.name).toBe('Chase');

    const socket = new FakeSocket();
    handleDmxWebsocketConnection(socket);
    socket.emit('message', Buffer.from(JSON.stringify({ type: 'functionStart', functionPublicId })));
    await viWaitForUniverse(app, 180);

    socket.emit('message', Buffer.from(JSON.stringify({ type: 'functionStop', functionPublicId })));
    await viWaitForUniverse(app, 0);
    expect(socket.sent.some(message => message.includes('functionState'))).toBe(true);

    const deleted = await graphqlQuery<{ deleteProjectFunction: { deleted: boolean } }>(
      server,
      gql`
        mutation ($publicId: UUID!) {
          deleteProjectFunction(publicId: $publicId) {
            deleted
          }
        }
      `,
      { variables: { publicId: functionPublicId } },
    );
    expect(deleted.data?.deleteProjectFunction.deleted).toBe(true);
  });
});

async function viWaitForUniverse(app: NestFastifyApplication, value: number): Promise<void> {
  const universe = app.get(DmxUniverseService);
  const started = Date.now();
  while (universe.getFrame()[7] !== value) {
    if (Date.now() - started > 2000) {
      throw new Error(`channel 7 stayed at ${universe.getFrame()[7]}, expected ${value}`);
    }
    await new Promise(resolve => setTimeout(resolve, 20));
  }
}
