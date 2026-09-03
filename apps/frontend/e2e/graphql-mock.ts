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
      fixtureChannelAssignments: [
        {
          __typename: 'FixtureChannelAssignmentDto',
          publicId: 'assign-1',
          channelNumber: 1,
          createdAt: now,
          updatedAt: now,
          fixtureChannelDefinition: {
            __typename: 'FixtureChannelDefinitionDto',
            publicId: 'def-1',
            name: 'Dimmer',
            order: 0,
            preset: 'DIMMER',
            createdAt: now,
            updatedAt: now,
            fixtureChannelRanges: [],
          },
        },
      ],
    },
  ],
};

export const mockedProject = {
  __typename: 'ProjectDto',
  publicId: 'proj-1',
  name: 'Main Show',
  roomWidth: 10,
  roomLength: 8,
  roomHeight: 5,
  createdAt: now,
  updatedAt: now,
};

type MockedProjectFixture = {
  __typename: 'ProjectFixtureDto';
  publicId: string;
  startAddress: number;
  createdAt: string;
  updatedAt: string;
  fixture: {
    __typename: 'ProjectFixtureFixtureDto';
    publicId: string;
    name: string;
    fixtureVendor: {
      __typename: 'FixtureVendorDto';
      publicId: string;
      name: string;
    };
  };
  channelMode: {
    __typename: 'ProjectFixtureChannelModeDto';
    publicId: string;
    name: string;
    fixtureChannelAssignments: {
      channelNumber: number;
      fixtureChannelDefinition: { preset: string };
    }[];
  };
};

export const mockGraphql = async (page: Page) => {
  const fixtures = [mockedFixture];
  const projects = [{ ...mockedProject }];
  const projectFixtures: Record<string, MockedProjectFixture[]> = {
    [mockedProject.publicId]: [],
  };

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
        input?: {
          publicId?: string;
          name?: string;
          roomWidth?: number;
          roomLength?: number;
          roomHeight?: number;
          projectPublicId?: string;
          fixturePublicId?: string;
          channelModePublicId?: string;
          startAddress?: number;
          channelModePublicId?: string;
        };
        document?: { schemaVersion: number; projects: { publicId?: string; name: string }[] };
      };
    };

    let body: unknown = { data: {} };
    if (postData.operationName === 'ExportProjects' || postData.query?.includes('exportProjects')) {
      body = {
        data: {
          exportProjects: {
            schemaVersion: 3,
            projects: projects.map(project => ({
              publicId: project.publicId,
              name: project.name,
              createdAt: project.createdAt,
              updatedAt: project.updatedAt,
              projectFixtures: projectFixtures[project.publicId] ?? [],
            })),
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
            roomWidth: 10,
            roomLength: 8,
            roomHeight: 5,
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
    } else if (postData.operationName === 'GetProject' || postData.query?.includes('project(publicId')) {
      const publicId = postData.variables?.publicId ?? mockedProject.publicId;
      const project = projects.find(entry => entry.publicId === publicId);
      body = {
        data: {
          project: project
            ? {
                ...project,
                projectFixtures: projectFixtures[publicId] ?? [],
              }
            : null,
        },
      };
    } else if (postData.operationName === 'CreateProject' || postData.query?.includes('createProject')) {
      const name = postData.variables?.name ?? 'New Project';
      const created = {
        __typename: 'ProjectDto',
        publicId: `proj-${projects.length + 1}`,
        name,
        roomWidth: 10,
        roomLength: 8,
        roomHeight: 5,
        createdAt: now,
        updatedAt: now,
      };
      projects.push(created);
      projectFixtures[created.publicId] = [];
      body = { data: { createProject: created } };
    } else if (postData.operationName === 'UpdateProject' || postData.query?.includes('updateProject')) {
      const publicId = postData.variables?.input?.publicId;
      const name = postData.variables?.input?.name;
      const existing = projects.find(project => project.publicId === publicId);
      if (existing && name) {
        existing.name = name;
      }
      if (existing) {
        if (postData.variables?.input?.roomWidth !== undefined) {
          existing.roomWidth = postData.variables.input.roomWidth;
        }
        if (postData.variables?.input?.roomLength !== undefined) {
          existing.roomLength = postData.variables.input.roomLength;
        }
        if (postData.variables?.input?.roomHeight !== undefined) {
          existing.roomHeight = postData.variables.input.roomHeight;
        }
      }
      body = { data: { updateProject: existing ?? null } };
    } else if (postData.operationName === 'DeleteProject' || postData.query?.includes('deleteProject')) {
      const publicId = postData.variables?.publicId ?? mockedProject.publicId;
      const index = projects.findIndex(project => project.publicId === publicId);
      if (index >= 0) {
        projects.splice(index, 1);
      }
      body = { data: { deleteProject: { publicId, deleted: index >= 0 } } };
    } else if (postData.operationName === 'AddProjectFixture' || postData.query?.includes('addProjectFixture')) {
      const input = postData.variables?.input;
      const projectPublicId = input?.projectPublicId ?? mockedProject.publicId;
      const fixture = fixtures.find(entry => entry.publicId === input?.fixturePublicId) ?? mockedFixture;
      const mode =
        fixture.fixtureChannelModes.find(entry => entry.publicId === input?.channelModePublicId) ??
        fixture.fixtureChannelModes[0];
      const created: MockedProjectFixture = {
        __typename: 'ProjectFixtureDto',
        publicId: `pf-${(projectFixtures[projectPublicId]?.length ?? 0) + 1}`,
        startAddress: input?.startAddress ?? 1,
        createdAt: now,
        updatedAt: now,
        fixture: {
          __typename: 'ProjectFixtureFixtureDto',
          publicId: fixture.publicId,
          name: fixture.name,
          fixtureVendor: {
            __typename: 'FixtureVendorDto',
            publicId: fixture.fixtureVendor.publicId,
            name: fixture.fixtureVendor.name,
          },
        },
        channelMode: {
          __typename: 'ProjectFixtureChannelModeDto',
          publicId: mode?.publicId ?? 'mode-8',
          name: mode?.name ?? '8ch',
          fixtureChannelAssignments: mode?.fixtureChannelAssignments.map(assignment => ({
            channelNumber: assignment.channelNumber,
            fixtureChannelDefinition: {
              preset: assignment.fixtureChannelDefinition.preset,
            },
          })) ?? [{ channelNumber: 1, fixtureChannelDefinition: { preset: 'IntensityDimmer' } }],
        },
      };
      projectFixtures[projectPublicId] = [...(projectFixtures[projectPublicId] ?? []), created];
      body = { data: { addProjectFixture: created } };
    } else if (postData.operationName === 'UpdateProjectFixture' || postData.query?.includes('updateProjectFixture')) {
      const input = postData.variables?.input;
      const instances = Object.values(projectFixtures).flat();
      const existing = instances.find(instance => instance.publicId === input?.publicId);
      if (existing) {
        if (input?.startAddress !== undefined) {
          existing.startAddress = input.startAddress;
        }
        if (input?.channelModePublicId) {
          const mode = mockedFixture.fixtureChannelModes.find(entry => entry.publicId === input.channelModePublicId);
          if (mode) {
            existing.channelMode = {
              __typename: 'ProjectFixtureChannelModeDto',
              publicId: mode.publicId,
              name: mode.name,
              fixtureChannelAssignments: mode.fixtureChannelAssignments.map(assignment => ({
                channelNumber: assignment.channelNumber,
                fixtureChannelDefinition: {
                  preset: assignment.fixtureChannelDefinition.preset,
                },
              })),
            };
          }
        }
      }
      body = { data: { updateProjectFixture: existing ?? null } };
    } else if (postData.operationName === 'DeleteProjectFixture' || postData.query?.includes('deleteProjectFixture')) {
      const publicId = postData.variables?.publicId;
      let deleted = false;
      for (const [projectPublicId, instances] of Object.entries(projectFixtures)) {
        const index = instances.findIndex(instance => instance.publicId === publicId);
        if (index >= 0) {
          instances.splice(index, 1);
          projectFixtures[projectPublicId] = instances;
          deleted = true;
          break;
        }
      }
      body = { data: { deleteProjectFixture: { publicId, deleted } } };
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
