import { createE2eApp } from '@/testhelpers/e2e-app';
import { graphqlQuery } from '@/testhelpers/graphql-test-client';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
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

const UNKNOWN_PROJECT_PUBLIC_ID = '00000000-0000-4000-8000-000000000000';

describe('Project queries', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createE2eApp();
  });

  afterAll(async () => {
    await app.close();
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
          roomWidth
          roomLength
          roomHeight
        }
      }
    `;

    const body = await graphqlQuery<
      ProjectQuery & {
        project: { roomWidth: number; roomLength: number; roomHeight: number } | null;
      }
    >(app.getHttpAdapter().getInstance().server, query, {
      variables: {
        publicId,
      },
    });

    expect(body.data?.project?.publicId).toBe(publicId);
    expect(body.data?.project?.name).toBe('Query Project');
    expect(body.data?.project?.roomWidth).toBe(10);
    expect(body.data?.project?.roomLength).toBe(8);
    expect(body.data?.project?.roomHeight).toBe(5);
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
