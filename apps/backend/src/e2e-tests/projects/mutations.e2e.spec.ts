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

type UpdateProjectMutation = {
  updateProject: {
    name: string;
    publicId: string;
  };
};

type DeleteProjectMutation = {
  deleteProject: {
    deleted: boolean;
    publicId: string;
  };
};

type ProjectQuery = {
  project: {
    publicId: string;
  } | null;
};

const UNKNOWN_PROJECT_PUBLIC_ID = '00000000-0000-4000-8000-000000000000';

const CREATE_PROJECT = gql`
  mutation ($input: CreateProjectInput!) {
    createProject(input: $input) {
      name
      publicId
    }
  }
`;

describe('Project mutations', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createE2eApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create a project via createProject', async () => {
    const body = await graphqlQuery<CreateProjectMutation>(app.getHttpAdapter().getInstance().server, CREATE_PROJECT, {
      variables: {
        input: {
          name: 'E2E Project',
        },
      },
    });

    expect(body.data?.createProject.name).toBe('E2E Project');
    expect(body.data?.createProject.publicId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('should reject a duplicate project name', async () => {
    await graphqlQuery<CreateProjectMutation>(app.getHttpAdapter().getInstance().server, CREATE_PROJECT, {
      variables: {
        input: {
          name: 'Duplicate Project',
        },
      },
    });

    const body = await graphqlQuery<CreateProjectMutation>(app.getHttpAdapter().getInstance().server, CREATE_PROJECT, {
      variables: {
        input: {
          name: 'Duplicate Project',
        },
      },
    });

    expect(body.errors?.[0]?.message).toContain('Duplicate Project');
  });

  it('should rename a project via updateProject', async () => {
    const created = await graphqlQuery<CreateProjectMutation>(
      app.getHttpAdapter().getInstance().server,
      CREATE_PROJECT,
      {
        variables: {
          input: {
            name: 'Rename Me',
          },
        },
      },
    );

    const publicId = created.data?.createProject.publicId;
    expect(publicId).toBeDefined();

    const mutation = gql`
      mutation ($input: UpdateProjectInput!) {
        updateProject(input: $input) {
          name
          publicId
        }
      }
    `;

    const body = await graphqlQuery<UpdateProjectMutation>(app.getHttpAdapter().getInstance().server, mutation, {
      variables: {
        input: {
          publicId,
          name: 'Renamed Project',
        },
      },
    });

    expect(body.data?.updateProject.publicId).toBe(publicId);
    expect(body.data?.updateProject.name).toBe('Renamed Project');
  });

  it('should reject renaming to an existing project name', async () => {
    await graphqlQuery<CreateProjectMutation>(app.getHttpAdapter().getInstance().server, CREATE_PROJECT, {
      variables: {
        input: {
          name: 'Taken Name',
        },
      },
    });

    const created = await graphqlQuery<CreateProjectMutation>(
      app.getHttpAdapter().getInstance().server,
      CREATE_PROJECT,
      {
        variables: {
          input: {
            name: 'Other Name',
          },
        },
      },
    );

    const mutation = gql`
      mutation ($input: UpdateProjectInput!) {
        updateProject(input: $input) {
          name
          publicId
        }
      }
    `;

    const body = await graphqlQuery<UpdateProjectMutation>(app.getHttpAdapter().getInstance().server, mutation, {
      variables: {
        input: {
          publicId: created.data?.createProject.publicId,
          name: 'Taken Name',
        },
      },
    });

    expect(body.errors?.[0]?.message).toContain('Taken Name');
  });

  it('should return not found when updating an unknown project', async () => {
    const mutation = gql`
      mutation ($input: UpdateProjectInput!) {
        updateProject(input: $input) {
          name
          publicId
        }
      }
    `;

    const body = await graphqlQuery<UpdateProjectMutation>(app.getHttpAdapter().getInstance().server, mutation, {
      variables: {
        input: {
          publicId: UNKNOWN_PROJECT_PUBLIC_ID,
          name: 'Ghost',
        },
      },
    });

    expect(body.errors?.[0]?.message).toContain(UNKNOWN_PROJECT_PUBLIC_ID);
  });

  it('should delete a project via deleteProject', async () => {
    const created = await graphqlQuery<CreateProjectMutation>(
      app.getHttpAdapter().getInstance().server,
      CREATE_PROJECT,
      {
        variables: {
          input: {
            name: 'Delete Me',
          },
        },
      },
    );

    const publicId = created.data?.createProject.publicId;
    expect(publicId).toBeDefined();

    const mutation = gql`
      mutation ($publicId: UUID!) {
        deleteProject(publicId: $publicId) {
          deleted
          publicId
        }
      }
    `;

    const body = await graphqlQuery<DeleteProjectMutation>(app.getHttpAdapter().getInstance().server, mutation, {
      variables: {
        publicId,
      },
    });

    expect(body.data?.deleteProject).toEqual({ publicId, deleted: true });

    const again = await graphqlQuery<DeleteProjectMutation>(app.getHttpAdapter().getInstance().server, mutation, {
      variables: {
        publicId,
      },
    });

    expect(again.data?.deleteProject).toEqual({ publicId, deleted: false });

    const query = gql`
      query ($publicId: UUID!) {
        project(publicId: $publicId) {
          publicId
        }
      }
    `;

    const afterDelete = await graphqlQuery<ProjectQuery>(app.getHttpAdapter().getInstance().server, query, {
      variables: {
        publicId,
      },
    });

    expect(afterDelete.data?.project).toBeNull();
  });

  it('should return deleted false for an unknown project publicId', async () => {
    const mutation = gql`
      mutation ($publicId: UUID!) {
        deleteProject(publicId: $publicId) {
          deleted
          publicId
        }
      }
    `;

    const body = await graphqlQuery<DeleteProjectMutation>(app.getHttpAdapter().getInstance().server, mutation, {
      variables: {
        publicId: UNKNOWN_PROJECT_PUBLIC_ID,
      },
    });

    expect(body.data?.deleteProject).toEqual({ publicId: UNKNOWN_PROJECT_PUBLIC_ID, deleted: false });
  });
});
