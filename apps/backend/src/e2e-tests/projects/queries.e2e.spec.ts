import { AppModule } from '@/app.module';
import { SerialSendService } from '@/io/serial/serial-send.service';
import { graphqlQuery } from '@/testhelpers/graphql-test-client';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import gql from 'graphql-tag';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

type ProjectsQuery = {
  projects: {
    createdAt: string;
    name: string;
    publicId: string;
    updatedAt: string;
  }[];
};

type ProjectQuery = {
  project: {
    name: string;
    publicId: string;
  } | null;
};

type CreateProjectMutation = {
  createProject: {
    name: string;
    publicId: string;
  };
};

const ORIGINAL_ENV = process.env;
const UNKNOWN_PROJECT_PUBLIC_ID = '00000000-0000-4000-8000-000000000000';

describe('Project queries', () => {
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

  it('should return a list of projects including created ones', async () => {
    const createMutation = gql`
      mutation ($input: CreateProjectInput!) {
        createProject(input: $input) {
          name
          publicId
        }
      }
    `;

    const created = await graphqlQuery<CreateProjectMutation>(
      app.getHttpAdapter().getInstance().server,
      createMutation,
      {
        variables: {
          input: {
            name: 'List Project',
          },
        },
      },
    );

    const publicId = created.data?.createProject.publicId;
    expect(publicId).toBeDefined();

    const query = gql`
      query {
        projects {
          createdAt
          name
          publicId
          updatedAt
        }
      }
    `;

    const body = await graphqlQuery<ProjectsQuery>(app.getHttpAdapter().getInstance().server, query);

    expect(body.data?.projects).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'List Project', publicId })]),
    );
  });

  it('should return a project by publicId after create', async () => {
    const createMutation = gql`
      mutation ($input: CreateProjectInput!) {
        createProject(input: $input) {
          name
          publicId
        }
      }
    `;

    const created = await graphqlQuery<CreateProjectMutation>(
      app.getHttpAdapter().getInstance().server,
      createMutation,
      {
        variables: {
          input: {
            name: 'Query Project',
          },
        },
      },
    );

    const publicId = created.data?.createProject.publicId;
    expect(publicId).toBeDefined();

    const query = gql`
      query ($publicId: UUID!) {
        project(publicId: $publicId) {
          name
          publicId
        }
      }
    `;

    const body = await graphqlQuery<ProjectQuery>(app.getHttpAdapter().getInstance().server, query, {
      variables: {
        publicId,
      },
    });

    expect(body.data?.project?.publicId).toBe(publicId);
    expect(body.data?.project?.name).toBe('Query Project');
  });

  it('should return null for an unknown project publicId', async () => {
    const query = gql`
      query ($publicId: UUID!) {
        project(publicId: $publicId) {
          publicId
        }
      }
    `;

    const body = await graphqlQuery<ProjectQuery>(app.getHttpAdapter().getInstance().server, query, {
      variables: {
        publicId: UNKNOWN_PROJECT_PUBLIC_ID,
      },
    });

    expect(body.data?.project).toBeNull();
  });
});
