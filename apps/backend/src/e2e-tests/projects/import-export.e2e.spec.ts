import { AppModule } from '@/app.module';
import { SerialSendService } from '@/io/serial/serial-send.service';
import { graphqlQuery } from '@/testhelpers/graphql-test-client';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import gql from 'graphql-tag';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const NEW_PROJECT_PUBLIC_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CONFLICT_SOURCE_PUBLIC_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const CONFLICT_TARGET_PUBLIC_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

type ExportProjectsQuery = {
  exportProjects: {
    schemaVersion: number;
    projects: { publicId: string; name: string; createdAt: string; updatedAt: string }[];
  };
};

type ImportProjectsMutation = {
  importProjects: {
    importedCount: number;
    projects: { publicId: string; name: string }[];
  };
};

type CreateProjectMutation = {
  createProject: {
    name: string;
    publicId: string;
  };
};

const ORIGINAL_ENV = process.env;

const EXPORT_PROJECTS = gql`
  query {
    exportProjects {
      schemaVersion
      projects {
        publicId
        name
        createdAt
        updatedAt
      }
    }
  }
`;

const IMPORT_PROJECTS = gql`
  mutation ($document: ImportProjectsInput!) {
    importProjects(document: $document) {
      importedCount
      projects {
        publicId
        name
      }
    }
  }
`;

const CREATE_PROJECT = gql`
  mutation ($input: CreateProjectInput!) {
    createProject(input: $input) {
      name
      publicId
    }
  }
`;

describe('Project import/export', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    process.env = {
      ...ORIGINAL_ENV,
      BACKEND_PORT: '3000',
      POSTGRES_USER: 'u',
      POSTGRES_PASSWORD: 'p',
      POSTGRES_HOST: 'h',
      POSTGRES_PORT: '5432',
      POSTGRES_DB: 'db',
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SerialSendService)
      .useValue({
        onModuleInit: () => undefined,
        onModuleDestroy: () => undefined,
      })
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
    process.env = ORIGINAL_ENV;
  });

  it('exports created projects in a versioned document', async () => {
    await graphqlQuery<CreateProjectMutation>(app.getHttpAdapter().getInstance().server, CREATE_PROJECT, {
      variables: { input: { name: 'Export List Project' } },
    });

    const body = await graphqlQuery<ExportProjectsQuery>(app.getHttpAdapter().getInstance().server, EXPORT_PROJECTS);
    expect(body.data?.exportProjects.schemaVersion).toBe(1);
    const exported = body.data?.exportProjects.projects.find(project => project.name === 'Export List Project');
    expect(exported?.createdAt).toBeTruthy();
    expect(exported?.updatedAt).toBeTruthy();
  });

  it('imports a new project and upserts by publicId', async () => {
    const created = await graphqlQuery<ImportProjectsMutation>(
      app.getHttpAdapter().getInstance().server,
      IMPORT_PROJECTS,
      {
        variables: {
          document: {
            schemaVersion: 1,
            projects: [{ publicId: NEW_PROJECT_PUBLIC_ID, name: 'Imported Show' }],
          },
        },
      },
    );

    expect(created.errors).toBeUndefined();
    expect(created.data?.importProjects.importedCount).toBe(1);
    expect(created.data?.importProjects.projects[0]).toEqual({
      publicId: NEW_PROJECT_PUBLIC_ID,
      name: 'Imported Show',
    });

    const updated = await graphqlQuery<ImportProjectsMutation>(
      app.getHttpAdapter().getInstance().server,
      IMPORT_PROJECTS,
      {
        variables: {
          document: {
            schemaVersion: 1,
            projects: [{ publicId: NEW_PROJECT_PUBLIC_ID, name: 'Imported Show Upserted' }],
          },
        },
      },
    );

    expect(updated.errors).toBeUndefined();
    expect(updated.data?.importProjects.projects[0]?.name).toBe('Imported Show Upserted');
  });

  it('rejects an import when publicId and name match different projects', async () => {
    await graphqlQuery<ImportProjectsMutation>(app.getHttpAdapter().getInstance().server, IMPORT_PROJECTS, {
      variables: {
        document: {
          schemaVersion: 1,
          projects: [
            { publicId: CONFLICT_SOURCE_PUBLIC_ID, name: 'Conflict Source' },
            { publicId: CONFLICT_TARGET_PUBLIC_ID, name: 'Conflict Target' },
          ],
        },
      },
    });

    const body = await graphqlQuery<ImportProjectsMutation>(
      app.getHttpAdapter().getInstance().server,
      IMPORT_PROJECTS,
      {
        variables: {
          document: {
            schemaVersion: 1,
            projects: [{ publicId: CONFLICT_SOURCE_PUBLIC_ID, name: 'Conflict Target' }],
          },
        },
      },
    );

    expect(body.errors?.[0]?.message).toContain(CONFLICT_SOURCE_PUBLIC_ID);
  });

  it('rejects an unsupported schemaVersion', async () => {
    const body = await graphqlQuery<ImportProjectsMutation>(
      app.getHttpAdapter().getInstance().server,
      IMPORT_PROJECTS,
      {
        variables: {
          document: {
            schemaVersion: 2,
            projects: [],
          },
        },
      },
    );

    expect(body.errors?.[0]?.message).toContain('schemaVersion');
  });
});
