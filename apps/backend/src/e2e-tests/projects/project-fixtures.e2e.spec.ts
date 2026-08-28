import { AppModule } from '@/app.module';
import { SerialSendService } from '@/io/serial/serial-send.service';
import { SEED_FIXTURE_PUBLIC_ID } from '@/testhelpers/seed-fixture-data';
import { graphqlQuery } from '@/testhelpers/graphql-test-client';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import gql from 'graphql-tag';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const SEED_CHANNEL_MODE_PUBLIC_ID = '2c93eb61-16c1-4b1a-98aa-8e74fcbb64c9';
const WRONG_FIXTURE_CHANNEL_MODE_PUBLIC_ID = 'e2c01c77-7e9f-46ce-bc11-26038d5b1774';

type CreateProjectMutation = {
  createProject: {
    name: string;
    publicId: string;
  };
};

type AddProjectFixtureMutation = {
  addProjectFixture: {
    publicId: string;
    startAddress: number;
    fixture: { publicId: string; name: string };
    channelMode: { publicId: string; name: string; fixtureChannelAssignments: { channelNumber: number }[] };
  };
};

type ProjectQuery = {
  project: {
    publicId: string;
    name: string;
    projectFixtures: {
      publicId: string;
      startAddress: number;
      fixture: { publicId: string };
      channelMode: { publicId: string; fixtureChannelAssignments: { channelNumber: number }[] };
    }[];
  } | null;
};

const ORIGINAL_ENV = process.env;

const CREATE_PROJECT = gql`
  mutation ($input: CreateProjectInput!) {
    createProject(input: $input) {
      name
      publicId
    }
  }
`;

const ADD_PROJECT_FIXTURE = gql`
  mutation ($input: AddProjectFixtureInput!) {
    addProjectFixture(input: $input) {
      publicId
      startAddress
      fixture {
        publicId
        name
      }
      channelMode {
        publicId
        name
        fixtureChannelAssignments {
          channelNumber
        }
      }
    }
  }
`;

const UPDATE_PROJECT_FIXTURE = gql`
  mutation ($input: UpdateProjectFixtureInput!) {
    updateProjectFixture(input: $input) {
      publicId
      startAddress
      channelMode {
        publicId
      }
    }
  }
`;

const DELETE_PROJECT_FIXTURE = gql`
  mutation ($publicId: UUID!) {
    deleteProjectFixture(publicId: $publicId) {
      publicId
      deleted
    }
  }
`;

const GET_PROJECT = gql`
  query ($publicId: UUID!) {
    project(publicId: $publicId) {
      publicId
      name
      projectFixtures {
        publicId
        startAddress
        fixture {
          publicId
        }
        channelMode {
          publicId
          fixtureChannelAssignments {
            channelNumber
          }
        }
      }
    }
  }
`;

describe('Project fixture mutations', () => {
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

  it('should add, update, and delete a project fixture instance', async () => {
    const created = await graphqlQuery<CreateProjectMutation>(
      app.getHttpAdapter().getInstance().server,
      CREATE_PROJECT,
      {
        variables: { input: { name: 'Patch Project' } },
      },
    );
    const projectPublicId = created.data?.createProject.publicId;
    expect(projectPublicId).toBeDefined();

    const added = await graphqlQuery<AddProjectFixtureMutation>(
      app.getHttpAdapter().getInstance().server,
      ADD_PROJECT_FIXTURE,
      {
        variables: {
          input: {
            projectPublicId,
            fixturePublicId: SEED_FIXTURE_PUBLIC_ID,
            channelModePublicId: SEED_CHANNEL_MODE_PUBLIC_ID,
            startAddress: 1,
          },
        },
      },
    );

    expect(added.errors).toBeUndefined();
    expect(added.data?.addProjectFixture.startAddress).toBe(1);
    expect(added.data?.addProjectFixture.fixture.publicId).toBe(SEED_FIXTURE_PUBLIC_ID);
    expect(added.data?.addProjectFixture.channelMode.fixtureChannelAssignments).toHaveLength(4);

    const instancePublicId = added.data?.addProjectFixture.publicId;
    expect(instancePublicId).toBeDefined();

    const queried = await graphqlQuery<ProjectQuery>(app.getHttpAdapter().getInstance().server, GET_PROJECT, {
      variables: { publicId: projectPublicId },
    });
    expect(queried.data?.project?.projectFixtures).toHaveLength(1);
    expect(queried.data?.project?.projectFixtures[0]?.publicId).toBe(instancePublicId);

    const updated = await graphqlQuery<{ updateProjectFixture: { startAddress: number } }>(
      app.getHttpAdapter().getInstance().server,
      UPDATE_PROJECT_FIXTURE,
      {
        variables: {
          input: {
            publicId: instancePublicId,
            startAddress: 10,
          },
        },
      },
    );
    expect(updated.errors).toBeUndefined();
    expect(updated.data?.updateProjectFixture.startAddress).toBe(10);

    const deleted = await graphqlQuery<{ deleteProjectFixture: { deleted: boolean } }>(
      app.getHttpAdapter().getInstance().server,
      DELETE_PROJECT_FIXTURE,
      {
        variables: { publicId: instancePublicId },
      },
    );
    expect(deleted.data?.deleteProjectFixture.deleted).toBe(true);
  });

  it('should reject a channel mode that does not belong to the fixture', async () => {
    const created = await graphqlQuery<CreateProjectMutation>(
      app.getHttpAdapter().getInstance().server,
      CREATE_PROJECT,
      {
        variables: { input: { name: 'Mismatch Project' } },
      },
    );
    const projectPublicId = created.data?.createProject.publicId;

    const body = await graphqlQuery(app.getHttpAdapter().getInstance().server, ADD_PROJECT_FIXTURE, {
      variables: {
        input: {
          projectPublicId,
          fixturePublicId: SEED_FIXTURE_PUBLIC_ID,
          channelModePublicId: '00000000-0000-4000-8000-000000000099',
          startAddress: 1,
        },
      },
    });

    expect(body.errors?.[0]?.message).toBeTruthy();
  });

  it('should reject a start address that overflows the universe', async () => {
    const created = await graphqlQuery<CreateProjectMutation>(
      app.getHttpAdapter().getInstance().server,
      CREATE_PROJECT,
      {
        variables: { input: { name: 'Overflow Project' } },
      },
    );
    const projectPublicId = created.data?.createProject.publicId;

    const body = await graphqlQuery(app.getHttpAdapter().getInstance().server, ADD_PROJECT_FIXTURE, {
      variables: {
        input: {
          projectPublicId,
          fixturePublicId: SEED_FIXTURE_PUBLIC_ID,
          channelModePublicId: WRONG_FIXTURE_CHANNEL_MODE_PUBLIC_ID,
          startAddress: 510,
        },
      },
    });

    expect(body.errors?.[0]?.message).toContain('512');
  });
});
