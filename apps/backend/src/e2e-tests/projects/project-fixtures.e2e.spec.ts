import { setupCatalogFixture, type CatalogFixture } from '../fixtures/catalog-fixture';
import { createE2eApp } from '@/testhelpers/e2e-app';
import { graphqlQuery } from '@/testhelpers/graphql-test-client';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import gql from 'graphql-tag';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

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
  let catalog: CatalogFixture;

  beforeAll(async () => {
    app = await createE2eApp();

    catalog = await setupCatalogFixture(app.getHttpAdapter().getInstance().server, {
      fixtureName: 'E2E ProjectFixtures Catalog Par',
    });
  });

  afterAll(async () => {
    await app.close();
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
            fixturePublicId: catalog.fixturePublicId,
            channelModePublicId: catalog.fourChannelModePublicId,
            startAddress: 1,
          },
        },
      },
    );

    expect(added.errors).toBeUndefined();
    expect(added.data?.addProjectFixture.startAddress).toBe(1);
    expect(added.data?.addProjectFixture.fixture.publicId).toBe(catalog.fixturePublicId);
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
          fixturePublicId: catalog.fixturePublicId,
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
          fixturePublicId: catalog.fixturePublicId,
          channelModePublicId: catalog.fiveChannelModePublicId,
          startAddress: 510,
        },
      },
    });

    expect(body.errors?.[0]?.message).toContain('512');
  });

  it('should reject a start address that overlaps another fixture in the project', async () => {
    const created = await graphqlQuery<CreateProjectMutation>(
      app.getHttpAdapter().getInstance().server,
      CREATE_PROJECT,
      {
        variables: { input: { name: 'Overlap Project' } },
      },
    );
    const projectPublicId = created.data?.createProject.publicId;

    const first = await graphqlQuery<AddProjectFixtureMutation>(
      app.getHttpAdapter().getInstance().server,
      ADD_PROJECT_FIXTURE,
      {
        variables: {
          input: {
            projectPublicId,
            fixturePublicId: catalog.fixturePublicId,
            channelModePublicId: catalog.fourChannelModePublicId,
            startAddress: 1,
          },
        },
      },
    );
    expect(first.errors).toBeUndefined();

    const overlappingAdd = await graphqlQuery(app.getHttpAdapter().getInstance().server, ADD_PROJECT_FIXTURE, {
      variables: {
        input: {
          projectPublicId,
          fixturePublicId: catalog.fixturePublicId,
          channelModePublicId: catalog.fourChannelModePublicId,
          startAddress: 4,
        },
      },
    });
    expect(overlappingAdd.errors?.[0]?.message).toContain('overlaps');

    const adjacent = await graphqlQuery<AddProjectFixtureMutation>(
      app.getHttpAdapter().getInstance().server,
      ADD_PROJECT_FIXTURE,
      {
        variables: {
          input: {
            projectPublicId,
            fixturePublicId: catalog.fixturePublicId,
            channelModePublicId: catalog.fourChannelModePublicId,
            startAddress: 5,
          },
        },
      },
    );
    expect(adjacent.errors).toBeUndefined();

    const overlappingUpdate = await graphqlQuery(app.getHttpAdapter().getInstance().server, UPDATE_PROJECT_FIXTURE, {
      variables: {
        input: {
          publicId: adjacent.data?.addProjectFixture.publicId,
          startAddress: 3,
        },
      },
    });
    expect(overlappingUpdate.errors?.[0]?.message).toContain('overlaps');
  });

  it('should reject an import whose patched fixtures overlap', async () => {
    const body = await graphqlQuery(app.getHttpAdapter().getInstance().server, IMPORT_PROJECTS, {
      variables: {
        document: {
          schemaVersion: 2,
          projects: [
            {
              publicId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
              name: 'Imported Overlap Show',
              projectFixtures: [
                {
                  fixturePublicId: catalog.fixturePublicId,
                  channelModePublicId: catalog.fourChannelModePublicId,
                  startAddress: 1,
                },
                {
                  fixturePublicId: catalog.fixturePublicId,
                  channelModePublicId: catalog.fourChannelModePublicId,
                  startAddress: 4,
                },
              ],
            },
          ],
        },
      },
    });

    expect(body.errors?.[0]?.message).toContain('overlaps');
  });
});
