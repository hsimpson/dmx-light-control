import { Page } from '@playwright/test';

const now = '2026-01-01T00:00:00.000Z';

export const mockedFixture = {
  __typename: 'FixtureDto',
  publicId: 'fix-1',
  name: 'Spot 250',
  createdAt: now,
  updatedAt: now,
  fixtureVendor: {
    __typename: 'FixtureVendorDto',
    publicId: 'vendor-1',
    name: 'Acme Lights',
    createdAt: now,
    updatedAt: now,
  },
  fixtureChannelDefinitions: [],
  fixtureChannelModes: [
    {
      __typename: 'FixtureChannelModeDto',
      publicId: 'mode-8',
      name: '8ch',
      order: 0,
      createdAt: now,
      updatedAt: now,
      fixtureChannelAssignments: [],
    },
  ],
};

export const mockedProject = {
  __typename: 'ProjectDto',
  publicId: 'proj-1',
  name: 'Main Show',
  createdAt: now,
  updatedAt: now,
};

export const mockGraphql = async (page: Page) => {
  const fixtures = [mockedFixture];
  const projects = [{ ...mockedProject }];

  await page.route('**/graphql', async route => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204 });
      return;
    }

    const postData = route.request().postDataJSON() as {
      operationName?: string;
      query?: string;
      variables?: {
        name?: string;
        publicId?: string;
        input?: { publicId?: string; name?: string };
        document?: { schemaVersion: number; projects: { publicId?: string; name: string }[] };
      };
    };

    let body: unknown = { data: {} };
    if (postData.operationName === 'ExportProjects' || postData.query?.includes('exportProjects')) {
      body = {
        data: {
          exportProjects: {
            schemaVersion: 1,
            projects: projects.map(project => ({ publicId: project.publicId, name: project.name })),
          },
        },
      };
    } else if (postData.operationName === 'ImportProjects' || postData.query?.includes('importProjects')) {
      const incoming = postData.variables?.document?.projects ?? [];
      for (const item of incoming) {
        const existing = item.publicId
          ? projects.find(project => project.publicId === item.publicId)
          : projects.find(project => project.name === item.name);
        if (existing) {
          existing.name = item.name;
        } else {
          projects.push({
            __typename: 'ProjectDto',
            publicId: item.publicId ?? `proj-${projects.length + 1}`,
            name: item.name,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
      body = {
        data: {
          importProjects: {
            importedCount: incoming.length,
            projects: [...projects],
          },
        },
      };
    } else if (postData.operationName === 'GetProjects' || postData.query?.includes('projects {')) {
      body = { data: { projects: [...projects] } };
    } else if (postData.operationName === 'CreateProject' || postData.query?.includes('createProject')) {
      const name = postData.variables?.name ?? 'New Project';
      const created = {
        __typename: 'ProjectDto',
        publicId: `proj-${projects.length + 1}`,
        name,
        createdAt: now,
        updatedAt: now,
      };
      projects.push(created);
      body = { data: { createProject: created } };
    } else if (postData.operationName === 'UpdateProject' || postData.query?.includes('updateProject')) {
      const publicId = postData.variables?.input?.publicId;
      const name = postData.variables?.input?.name;
      const existing = projects.find(project => project.publicId === publicId);
      if (existing && name) {
        existing.name = name;
      }
      body = { data: { updateProject: existing ?? null } };
    } else if (postData.operationName === 'DeleteProject' || postData.query?.includes('deleteProject')) {
      const publicId = postData.variables?.publicId ?? mockedProject.publicId;
      const index = projects.findIndex(project => project.publicId === publicId);
      if (index >= 0) {
        projects.splice(index, 1);
      }
      body = { data: { deleteProject: { publicId, deleted: index >= 0 } } };
    } else if (postData.operationName === 'ExportFixtures' || postData.query?.includes('exportFixtures')) {
      body = {
        data: {
          exportFixtures: {
            schemaVersion: 1,
            vendors: [],
            fixtures: [],
          },
        },
      };
    } else if (postData.operationName === 'ImportFixtures' || postData.query?.includes('importFixtures')) {
      body = { data: { importFixtures: { importedCount: 0, fixtures: [...fixtures] } } };
    } else if (postData.operationName === 'DeleteFixture' || postData.query?.includes('deleteFixture')) {
      fixtures.splice(0, fixtures.length);
      body = { data: { deleteFixture: { publicId: mockedFixture.publicId, deleted: true } } };
    } else if (postData.operationName === 'GetFixtures' || postData.query?.includes('fixtures {')) {
      body = { data: { fixtures: [...fixtures] } };
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
};
