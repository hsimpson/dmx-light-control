import { createE2eApp } from '@/testhelpers/e2e-app';
import { graphqlQuery } from '@/testhelpers/graphql-test-client';
import { identityTransform } from '@/projects/project-3d-object.transform';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import gql from 'graphql-tag';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const NEW_PROJECT_PUBLIC_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CONFLICT_SOURCE_PUBLIC_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const CONFLICT_TARGET_PUBLIC_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

type ExportProjectsQuery = {
  exportProjects: {
    schemaVersion: number;
    projects: {
      publicId: string;
      name: string;
      environmentType: string;
      roomWidth: number;
      roomLength: number;
      roomHeight: number;
      createdAt: string;
      updatedAt: string;
    }[];
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

const EXPORT_PROJECTS = gql`
  query {
    exportProjects {
      schemaVersion
      projects {
        publicId
        name
        environmentType
        roomWidth
        roomLength
        roomHeight
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
    app = await createE2eApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('exports created projects in a versioned document', async () => {
    await graphqlQuery<CreateProjectMutation>(app.getHttpAdapter().getInstance().server, CREATE_PROJECT, {
      variables: { input: { name: 'Export List Project' } },
    });

    const body = await graphqlQuery<ExportProjectsQuery>(app.getHttpAdapter().getInstance().server, EXPORT_PROJECTS);
    expect(body.data?.exportProjects.schemaVersion).toBe(7);
    const exported = body.data?.exportProjects.projects.find(project => project.name === 'Export List Project');
    expect(exported?.environmentType).toBe('SimpleGround');
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

  it('imports schemaVersion 3 without environmentType as Room', async () => {
    const publicId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
    const imported = await graphqlQuery<ImportProjectsMutation>(
      app.getHttpAdapter().getInstance().server,
      IMPORT_PROJECTS,
      {
        variables: {
          document: {
            schemaVersion: 3,
            projects: [{ publicId, name: 'Legacy Room Show', roomWidth: 12, roomLength: 9, roomHeight: 4 }],
          },
        },
      },
    );

    expect(imported.errors).toBeUndefined();

    const query = gql`
      query ($publicId: UUID!) {
        project(publicId: $publicId) {
          environmentType
        }
      }
    `;
    const body = await graphqlQuery<{ project: { environmentType: string } | null }>(
      app.getHttpAdapter().getInstance().server,
      query,
      { variables: { publicId } },
    );
    expect(body.data?.project?.environmentType).toBe('Room');
  });

  it('rejects an unsupported schemaVersion', async () => {
    const body = await graphqlQuery<ImportProjectsMutation>(
      app.getHttpAdapter().getInstance().server,
      IMPORT_PROJECTS,
      {
        variables: {
          document: {
            schemaVersion: 99,
            projects: [],
          },
        },
      },
    );

    expect(body.errors?.[0]?.message).toContain('schemaVersion');
  });

  it('imports 3D objects when scene object type publicId differs from seeded catalog ids', async () => {
    const publicId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
    const staleTypePublicId = '77dceb2b-6341-460f-b4f5-c6ea50ee3b64';
    const imported = await graphqlQuery<ImportProjectsMutation>(
      app.getHttpAdapter().getInstance().server,
      IMPORT_PROJECTS,
      {
        variables: {
          document: {
            schemaVersion: 7,
            projects: [
              {
                publicId,
                name: 'Imported 3D Show',
                project3dObjects: [
                  {
                    name: 'Stage',
                    sceneObjectTypePublicId: staleTypePublicId,
                    sceneObjectTypeName: 'Box',
                    sizeX: 4,
                    sizeY: 0.5,
                    sizeZ: 2,
                    transform: identityTransform(),
                  },
                ],
              },
            ],
          },
        },
      },
    );

    expect(imported.errors).toBeUndefined();
    expect(imported.data?.importProjects.importedCount).toBe(1);

    const query = gql`
      query ($publicId: UUID!) {
        project(publicId: $publicId) {
          project3dObjects {
            name
            sceneObjectType {
              name
            }
          }
        }
      }
    `;
    const body = await graphqlQuery<{
      project: { project3dObjects: { name: string; sceneObjectType: { name: string } }[] } | null;
    }>(app.getHttpAdapter().getInstance().server, query, { variables: { publicId } });
    expect(body.data?.project?.project3dObjects).toEqual([{ name: 'Stage', sceneObjectType: { name: 'Box' } }]);
  });
});
