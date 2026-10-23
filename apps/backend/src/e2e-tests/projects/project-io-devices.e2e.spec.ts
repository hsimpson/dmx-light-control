import { createE2eApp } from '@/testhelpers/e2e-app';
import { graphqlQuery } from '@/testhelpers/graphql-test-client';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import gql from 'graphql-tag';
import type { App } from 'supertest/types';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const UNKNOWN_PROJECT_PUBLIC_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

const ftdi = {
  kind: 'DmxSerial',
  name: 'FT232R USB UART',
  manufacturer: 'FTDI',
  serial: 'A50285BI',
  vendorId: '0403',
  productId: '6001',
  usbLocation: '3-10',
};

const apc = {
  kind: 'Midi',
  name: 'APC mini mk2',
  manufacturer: 'AKAI professional',
  serial: 'Ver00.10',
  vendorId: '09e8',
  productId: '004f',
  usbLocation: '7&2A3B4C5D&0&0000',
};

type IoDevice = typeof ftdi;

const IO_DEVICE_FIELDS = 'kind name manufacturer serial vendorId productId usbLocation';

const CREATE_PROJECT = gql`
  mutation ($input: CreateProjectInput!) {
    createProject(input: $input) {
      publicId
    }
  }
`;

const UPDATE_IO_DEVICES = `
  mutation ($input: UpdateProjectIoDevicesInput!) {
    updateProjectIoDevices(input: $input) {
      publicId
      ioDevices { ${IO_DEVICE_FIELDS} }
    }
  }
`;

const GET_PROJECT = `
  query ($publicId: UUID!) {
    project(publicId: $publicId) {
      ioDevices { ${IO_DEVICE_FIELDS} }
    }
  }
`;

const EXPORT_PROJECTS = `
  query {
    exportProjects {
      projects {
        publicId
        ioDevices { ${IO_DEVICE_FIELDS} }
      }
    }
  }
`;

const IMPORT_PROJECTS = gql`
  mutation ($document: ImportProjectsInput!) {
    importProjects(document: $document) {
      importedCount
    }
  }
`;

const ACTIVATE_PROJECT = gql`
  mutation ($publicId: UUID!) {
    activateProject(publicId: $publicId) {
      publicId
    }
  }
`;

const DELETE_PROJECT = gql`
  mutation ($publicId: UUID!) {
    deleteProject(publicId: $publicId) {
      deleted
    }
  }
`;

const IO_DEVICE_STATES = `
  query {
    ioDevices { ${IO_DEVICE_FIELDS} status }
  }
`;

type IoDeviceState = IoDevice & { status: string };

describe('Project input/output devices', () => {
  let app: NestFastifyApplication;
  let server: App;

  async function createProject(name: string): Promise<string> {
    const body = await graphqlQuery<{ createProject: { publicId: string } }>(server, CREATE_PROJECT, {
      variables: { input: { name } },
    });
    const publicId = body.data?.createProject.publicId;
    if (!publicId) throw new Error(`createProject failed: ${JSON.stringify(body.errors)}`);
    return publicId;
  }

  async function storedIoDevices(publicId: string): Promise<IoDevice[] | undefined> {
    const body = await graphqlQuery<{ project: { ioDevices: IoDevice[] } }>(server, GET_PROJECT, {
      variables: { publicId },
    });
    return body.data?.project.ioDevices;
  }

  async function updateIoDevices(publicId: string, ioDevices: unknown[]) {
    return graphqlQuery<{ updateProjectIoDevices: { publicId: string; ioDevices: IoDevice[] } }>(
      server,
      UPDATE_IO_DEVICES,
      { variables: { input: { publicId, ioDevices } } },
    );
  }

  beforeAll(async () => {
    app = await createE2eApp();
    server = app.getHttpAdapter().getInstance().server;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GIVEN a new project WHEN queried THEN it has no devices', async () => {
    const publicId = await createProject('IO Empty Project');

    await expect(storedIoDevices(publicId)).resolves.toEqual([]);
  });

  it('GIVEN devices WHEN updateProjectIoDevices THEN the list is replaced and persisted', async () => {
    const publicId = await createProject('IO Replace Project');

    const first = await updateIoDevices(publicId, [ftdi, apc]);
    const second = await updateIoDevices(publicId, [apc]);

    expect(first.errors).toBeUndefined();
    expect(first.data?.updateProjectIoDevices.ioDevices).toEqual([ftdi, apc]);
    expect(second.data?.updateProjectIoDevices.ioDevices).toEqual([apc]);
    await expect(storedIoDevices(publicId)).resolves.toEqual([apc]);
  });

  it('GIVEN a device without optional fields WHEN saved THEN they are stored as null', async () => {
    const publicId = await createProject('IO Minimal Project');

    const body = await updateIoDevices(publicId, [{ kind: 'Midi', name: 'Keys' }]);

    expect(body.data?.updateProjectIoDevices.ioDevices).toEqual([
      {
        kind: 'Midi',
        name: 'Keys',
        manufacturer: null,
        serial: null,
        vendorId: null,
        productId: null,
        usbLocation: null,
      },
    ]);
  });

  it('GIVEN an unknown project WHEN saved THEN PROJECT_NOT_FOUND', async () => {
    const body = await updateIoDevices(UNKNOWN_PROJECT_PUBLIC_ID, [ftdi]);

    expect(body.errors?.[0]?.extensions?.code).toBe('PROJECT_NOT_FOUND');
  });

  it('GIVEN a project with devices WHEN exported and re-imported as v11 THEN devices round-trip', async () => {
    const publicId = await createProject('IO Export Project');
    await updateIoDevices(publicId, [ftdi]);

    const exported = await graphqlQuery<{
      exportProjects: { projects: { publicId: string; ioDevices: IoDevice[] }[] };
    }>(server, EXPORT_PROJECTS);
    const imported = await graphqlQuery<{ importProjects: { importedCount: number } }>(server, IMPORT_PROJECTS, {
      variables: {
        document: { schemaVersion: 11, projects: [{ publicId, name: 'IO Export Project', ioDevices: [apc] }] },
      },
    });

    expect(exported.data?.exportProjects.projects.find(project => project.publicId === publicId)?.ioDevices).toEqual([
      ftdi,
    ]);
    expect(imported.errors).toBeUndefined();
    await expect(storedIoDevices(publicId)).resolves.toEqual([apc]);
  });

  it('GIVEN a v10 import without devices WHEN imported over a project THEN its devices are kept', async () => {
    const publicId = await createProject('IO Legacy Import Project');
    await updateIoDevices(publicId, [ftdi]);

    const imported = await graphqlQuery<{ importProjects: { importedCount: number } }>(server, IMPORT_PROJECTS, {
      variables: { document: { schemaVersion: 10, projects: [{ publicId, name: 'IO Legacy Import Project' }] } },
    });

    expect(imported.errors).toBeUndefined();
    await expect(storedIoDevices(publicId)).resolves.toEqual([ftdi]);
  });

  describe('active project', () => {
    async function activate(publicId: string) {
      return graphqlQuery<{ activateProject: { publicId: string } }>(server, ACTIVATE_PROJECT, {
        variables: { publicId },
      });
    }

    async function expectActiveDevices(expected: IoDeviceState[]): Promise<void> {
      await vi.waitFor(async () => {
        const body = await graphqlQuery<{ ioDevices: IoDeviceState[] }>(server, IO_DEVICE_STATES);
        expect(body.data?.ioDevices).toEqual(expected);
      });
    }

    it('GIVEN a project with devices WHEN activated THEN its devices are reported (missing: nothing is plugged in)', async () => {
      const publicId = await createProject('IO Active Project');
      await updateIoDevices(publicId, [ftdi, apc]);

      const body = await activate(publicId);

      expect(body.data?.activateProject.publicId).toBe(publicId);
      await expectActiveDevices([
        { ...ftdi, status: 'Missing' },
        { ...apc, status: 'Missing' },
      ]);
    });

    it('GIVEN the active project WHEN its devices change THEN the active list follows', async () => {
      const publicId = await createProject('IO Active Update Project');
      await activate(publicId);

      await updateIoDevices(publicId, [apc]);

      await expectActiveDevices([{ ...apc, status: 'Missing' }]);
    });

    it('GIVEN another project WHEN its devices change THEN the active list is untouched', async () => {
      const activeId = await createProject('IO Active Untouched Project');
      const otherId = await createProject('IO Inactive Project');
      await updateIoDevices(activeId, [ftdi]);
      await activate(activeId);

      await updateIoDevices(otherId, [apc]);

      await expectActiveDevices([{ ...ftdi, status: 'Missing' }]);
    });

    it('GIVEN the active project WHEN imported with other devices THEN the active list is refreshed', async () => {
      const publicId = await createProject('IO Active Import Project');
      await updateIoDevices(publicId, [ftdi]);
      await activate(publicId);

      await graphqlQuery(server, IMPORT_PROJECTS, {
        variables: {
          document: { schemaVersion: 11, projects: [{ publicId, name: 'IO Active Import Project', ioDevices: [apc] }] },
        },
      });

      await expectActiveDevices([{ ...apc, status: 'Missing' }]);
    });

    it('GIVEN the active project WHEN deleted THEN no devices stay configured', async () => {
      const publicId = await createProject('IO Active Delete Project');
      await updateIoDevices(publicId, [ftdi]);
      await activate(publicId);

      await graphqlQuery(server, DELETE_PROJECT, { variables: { publicId } });

      await expectActiveDevices([]);
    });

    it('GIVEN an unknown project WHEN activated THEN PROJECT_NOT_FOUND', async () => {
      const body = await activate(UNKNOWN_PROJECT_PUBLIC_ID);

      expect(body.errors?.[0]?.extensions?.code).toBe('PROJECT_NOT_FOUND');
    });
  });
});
