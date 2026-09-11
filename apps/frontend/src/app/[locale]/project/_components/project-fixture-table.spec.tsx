import { renderWithProviders } from '@/testhelpers/render-with-providers';
import {
  AddProjectFixtureDocument,
  DeleteProjectFixtureDocument,
  FixtureChannelPreset,
  GetFixturesDocument,
  GetProjectDocument,
  UpdateProjectFixtureDocument,
} from '@/shared/types/graphql/graphql';
import { notifications } from '@mantine/notifications';
import { screen, waitFor, within } from '@testing-library/react';
import { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectFixtureTable from './project-fixture-table';

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

vi.mock('mantine-datatable', () => ({
  DataTable: ({
    records,
    columns,
    noRecordsText,
  }: {
    records: Record<string, unknown>[];
    columns: {
      accessor: string;
      render?: (record: Record<string, unknown>, index: number) => ReactNode;
    }[];
    noRecordsText?: string;
  }) => (
    <table>
      <tbody>
        {records.length === 0 ? (
          <tr>
            <td>{noRecordsText}</td>
          </tr>
        ) : (
          records.map((record, index) => (
            <tr key={String(record.publicId)}>
              {columns.map(column => {
                const cell = column.render
                  ? column.render(record, index)
                  : column.accessor.split('.').reduce<unknown>((value, key) => {
                      return (value as Record<string, unknown> | undefined)?.[key];
                    }, record);

                return <td key={column.accessor}>{cell as ReactNode}</td>;
              })}
            </tr>
          ))
        )}
      </tbody>
    </table>
  ),
}));

const now = new Date('2026-01-01T00:00:00.000Z');

const projectFixture = (overrides: { publicId: string; name: string; startAddress: number }) => ({
  __typename: 'ProjectFixtureDto' as const,
  publicId: overrides.publicId,
  startAddress: overrides.startAddress,
  fixture: {
    __typename: 'FixtureDto' as const,
    publicId: `fix-${overrides.publicId}`,
    name: overrides.name,
    fixtureVendor: { __typename: 'FixtureVendorDto' as const, publicId: 'vendor-1', name: 'Generic' },
  },
  channelMode: {
    __typename: 'FixtureChannelModeDto' as const,
    publicId: `mode-${overrides.publicId}`,
    name: '3ch',
    fixtureChannelAssignments: [
      {
        __typename: 'ProjectFixtureChannelAssignmentDto' as const,
        channelNumber: 1,
        fixtureChannelDefinition: {
          __typename: 'ProjectFixtureChannelDefinitionDto' as const,
          preset: FixtureChannelPreset.IntensityRed,
        },
      },
      {
        __typename: 'ProjectFixtureChannelAssignmentDto' as const,
        channelNumber: 2,
        fixtureChannelDefinition: {
          __typename: 'ProjectFixtureChannelDefinitionDto' as const,
          preset: FixtureChannelPreset.IntensityGreen,
        },
      },
      {
        __typename: 'ProjectFixtureChannelAssignmentDto' as const,
        channelNumber: 3,
        fixtureChannelDefinition: {
          __typename: 'ProjectFixtureChannelDefinitionDto' as const,
          preset: FixtureChannelPreset.IntensityBlue,
        },
      },
    ],
  },
  createdAt: now,
  updatedAt: now,
});

describe('ProjectFixtureTable', () => {
  it('shows empty state and opens the add fixture modal', async () => {
    const { user } = renderWithProviders(<ProjectFixtureTable projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: {
            data: {
              project: {
                __typename: 'ProjectDto',
                publicId: 'proj-1',
                name: 'Main Show',
                environmentType: 'SimpleGround',
                roomWidth: 10,
                roomLength: 8,
                roomHeight: 5,
                createdAt: now,
                updatedAt: now,
                projectFixtures: [],
                project3dObjects: [],
              },
            },
          },
        },
        {
          request: { query: GetFixturesDocument },
          result: { data: { fixtures: [] } },
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByText('No fixtures patched yet')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Add fixture' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Fixture');
    expect(dialog).toHaveTextContent('Channel mode');
  });

  it('shows sequential row numbers as the first column', async () => {
    renderWithProviders(<ProjectFixtureTable projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: {
            data: {
              project: {
                __typename: 'ProjectDto',
                publicId: 'proj-1',
                name: 'Main Show',
                environmentType: 'SimpleGround',
                roomWidth: 10,
                roomLength: 8,
                roomHeight: 5,
                createdAt: now,
                updatedAt: now,
                projectFixtures: [
                  projectFixture({ publicId: 'pf-a', name: 'PAR 64', startAddress: 10 }),
                  projectFixture({ publicId: 'pf-b', name: 'Spot', startAddress: 1 }),
                  projectFixture({ publicId: 'pf-c', name: 'Wash', startAddress: 20 }),
                ],
                project3dObjects: [],
              },
            },
          },
        },
        {
          request: { query: GetFixturesDocument },
          result: { data: { fixtures: [] } },
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByText('PAR 64')).toBeInTheDocument();
    });

    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(rows[0]?.querySelectorAll('td')[0]).toHaveTextContent('1');
    expect(rows[1]?.querySelectorAll('td')[0]).toHaveTextContent('2');
    expect(rows[2]?.querySelectorAll('td')[0]).toHaveTextContent('3');
  });

  it('blocks save when the start address overlaps another patched fixture', async () => {
    const catalogAssignments = [1, 2, 3].map(channelNumber => ({
      __typename: 'FixtureChannelAssignmentDto' as const,
      publicId: `assign-${channelNumber}`,
      channelNumber,
      createdAt: now,
      updatedAt: now,
      fixtureChannelDefinition: {
        __typename: 'FixtureChannelDefinitionDto' as const,
        publicId: `def-${channelNumber}`,
        name: `Ch ${channelNumber}`,
        order: channelNumber - 1,
        preset: FixtureChannelPreset.IntensityRed,
        createdAt: now,
        updatedAt: now,
        fixtureChannelRanges: [],
      },
    }));

    const { user } = renderWithProviders(<ProjectFixtureTable projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: {
            data: {
              project: {
                __typename: 'ProjectDto',
                publicId: 'proj-1',
                name: 'Main Show',
                environmentType: 'SimpleGround',
                roomWidth: 10,
                roomLength: 8,
                roomHeight: 5,
                createdAt: now,
                updatedAt: now,
                projectFixtures: [projectFixture({ publicId: 'pf-a', name: 'PAR 64', startAddress: 1 })],
                project3dObjects: [],
              },
            },
          },
        },
        {
          request: { query: GetFixturesDocument },
          result: {
            data: {
              fixtures: [
                {
                  __typename: 'FixtureDto',
                  publicId: 'catalog-1',
                  name: 'Wash',
                  weight: null,
                  width: null,
                  length: null,
                  height: null,
                  picturePath: null,
                  picture2dPath: null,
                  model3dPath: null,
                  createdAt: now,
                  updatedAt: now,
                  fixtureVendor: {
                    __typename: 'FixtureVendorDto',
                    publicId: 'vendor-1',
                    name: 'Generic',
                    createdAt: now,
                    updatedAt: now,
                  },
                  fixtureChannelDefinitions: [],
                  fixtureChannelModes: [
                    {
                      __typename: 'FixtureChannelModeDto',
                      publicId: 'mode-3',
                      name: '3ch',
                      order: 0,
                      createdAt: now,
                      updatedAt: now,
                      fixtureChannelAssignments: catalogAssignments,
                    },
                  ],
                },
              ],
            },
          },
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByText('PAR 64')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Add fixture' }));
    const dialog = await screen.findByRole('dialog');

    await user.click(screen.getByRole('combobox', { name: 'Fixture' }));
    await user.click(await screen.findByText('Generic – Wash'));

    const channelModeSelect = screen.getByRole('combobox', { name: 'Channel mode' });
    await waitFor(() => {
      expect(channelModeSelect).not.toBeDisabled();
    });
    await user.click(channelModeSelect);
    const modeOption = (await screen.findAllByText('3ch')).find(node => node.tagName === 'SPAN');
    expect(modeOption).toBeDefined();
    if (!modeOption) {
      throw new Error('expected channel mode option');
    }
    await user.click(modeOption);

    expect(dialog).toHaveTextContent('This address range overlaps another fixture in the project');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});

const catalogAssignments = [1, 2, 3].map(channelNumber => ({
  __typename: 'FixtureChannelAssignmentDto' as const,
  publicId: `assign-${channelNumber}`,
  channelNumber,
  createdAt: now,
  updatedAt: now,
  fixtureChannelDefinition: {
    __typename: 'FixtureChannelDefinitionDto' as const,
    publicId: `def-${channelNumber}`,
    name: `Ch ${channelNumber}`,
    order: channelNumber - 1,
    preset: FixtureChannelPreset.IntensityRed,
    createdAt: now,
    updatedAt: now,
    fixtureChannelRanges: [],
  },
}));

const catalogFixture = {
  __typename: 'FixtureDto' as const,
  publicId: 'catalog-1',
  name: 'Wash',
  weight: null,
  width: null,
  length: null,
  height: null,
  picturePath: null,
  picture2dPath: null,
  model3dPath: null,
  createdAt: now,
  updatedAt: now,
  fixtureVendor: {
    __typename: 'FixtureVendorDto' as const,
    publicId: 'vendor-1',
    name: 'Generic',
    createdAt: now,
    updatedAt: now,
  },
  fixtureChannelDefinitions: [],
  fixtureChannelModes: [
    {
      __typename: 'FixtureChannelModeDto' as const,
      publicId: 'mode-3',
      name: '3ch',
      order: 0,
      createdAt: now,
      updatedAt: now,
      fixtureChannelAssignments: catalogAssignments,
    },
  ],
};

const emptyProject = {
  __typename: 'ProjectDto' as const,
  publicId: 'proj-1',
  name: 'Main Show',
  environmentType: 'SimpleGround' as const,
  roomWidth: 10,
  roomLength: 8,
  roomHeight: 5,
  createdAt: now,
  updatedAt: now,
  projectFixtures: [] as ReturnType<typeof projectFixture>[],
  project3dObjects: [],
};

describe('ProjectFixtureTable mutations', () => {
  beforeEach(() => {
    vi.mocked(notifications.show).mockClear();
  });

  it('creates a patched fixture with a valid start address', async () => {
    const { user } = renderWithProviders(<ProjectFixtureTable projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          maxUsageCount: Number.POSITIVE_INFINITY,
          result: { data: { project: emptyProject } },
        },
        {
          request: { query: GetFixturesDocument },
          result: { data: { fixtures: [catalogFixture] } },
        },
        {
          request: {
            query: AddProjectFixtureDocument,
            variables: {
              input: {
                projectPublicId: 'proj-1',
                fixturePublicId: 'catalog-1',
                channelModePublicId: 'mode-3',
                startAddress: 10,
              },
            },
          },
          result: {
            data: {
              addProjectFixture: projectFixture({ publicId: 'pf-new', name: 'Wash', startAddress: 10 }),
            },
          },
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByText('No fixtures patched yet')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Add fixture' }));
    const dialog = await screen.findByRole('dialog');

    await user.click(screen.getByRole('combobox', { name: 'Fixture' }));
    await user.click(await screen.findByText('Generic – Wash'));

    const channelModeSelect = screen.getByRole('combobox', { name: 'Channel mode' });
    await waitFor(() => {
      expect(channelModeSelect).not.toBeDisabled();
    });
    await user.click(channelModeSelect);
    const modeOption = (await screen.findAllByText('3ch')).find(node => node.tagName === 'SPAN');
    if (!modeOption) {
      throw new Error('expected channel mode option');
    }
    await user.click(modeOption);

    const startAddressInput = screen.getByRole('textbox', { name: 'Start address' });
    await user.clear(startAddressInput);
    await user.type(startAddressInput, '10');

    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'green', title: 'Fixture added to project' }),
      );
    });
  });

  it('updates a patched fixture from the edit form', async () => {
    const existing = projectFixture({ publicId: 'pf-a', name: 'PAR 64', startAddress: 1 });
    const { user } = renderWithProviders(<ProjectFixtureTable projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          maxUsageCount: Number.POSITIVE_INFINITY,
          result: {
            data: {
              project: { ...emptyProject, projectFixtures: [existing] },
            },
          },
        },
        {
          request: { query: GetFixturesDocument },
          result: { data: { fixtures: [catalogFixture] } },
        },
        {
          request: {
            query: UpdateProjectFixtureDocument,
            variables: {
              input: {
                publicId: 'pf-a',
                channelModePublicId: 'mode-pf-a',
                startAddress: 20,
              },
            },
          },
          result: {
            data: {
              updateProjectFixture: projectFixture({ publicId: 'pf-a', name: 'PAR 64', startAddress: 20 }),
            },
          },
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByText('PAR 64')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Edit project fixture' }));
    const dialog = await screen.findByRole('dialog');
    const startAddressInput = screen.getByRole('textbox', { name: 'Start address' });
    await user.clear(startAddressInput);
    await user.type(startAddressInput, '20');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'green', title: 'Project fixture updated' }),
      );
    });
  });

  it('removes a patched fixture after confirmation', async () => {
    const existing = projectFixture({ publicId: 'pf-a', name: 'PAR 64', startAddress: 1 });
    const { user } = renderWithProviders(<ProjectFixtureTable projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          maxUsageCount: Number.POSITIVE_INFINITY,
          result: {
            data: {
              project: { ...emptyProject, projectFixtures: [existing] },
            },
          },
        },
        {
          request: { query: GetFixturesDocument },
          result: { data: { fixtures: [] } },
        },
        {
          request: {
            query: DeleteProjectFixtureDocument,
            variables: { publicId: 'pf-a' },
          },
          result: { data: { deleteProjectFixture: { publicId: 'pf-a', deleted: true } } },
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByText('PAR 64')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Remove fixture from project' }));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Remove fixture from project' }),
    );

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'green', title: 'Fixture removed from project' }),
      );
    });
  });

  it('shows an error when create fails', async () => {
    const { user } = renderWithProviders(<ProjectFixtureTable projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project: emptyProject } },
        },
        {
          request: { query: GetFixturesDocument },
          result: { data: { fixtures: [catalogFixture] } },
        },
        {
          request: {
            query: AddProjectFixtureDocument,
            variables: {
              input: {
                projectPublicId: 'proj-1',
                fixturePublicId: 'catalog-1',
                channelModePublicId: 'mode-3',
                startAddress: 10,
              },
            },
          },
          error: new Error('network'),
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add fixture' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Add fixture' }));
    const dialog = await screen.findByRole('dialog');

    await user.click(within(dialog).getByRole('combobox', { name: 'Fixture' }));
    await user.click(await screen.findByText('Generic – Wash'));
    await user.click(within(dialog).getByRole('combobox', { name: 'Channel mode' }));
    const modeOption = (await screen.findAllByText('3ch')).find(node => node.tagName === 'SPAN');
    if (!modeOption) {
      throw new Error('expected channel mode option');
    }
    await user.click(modeOption);

    const startAddressInput = within(dialog).getByRole('textbox', { name: 'Start address' });
    await user.clear(startAddressInput);
    await user.type(startAddressInput, '10');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'red', message: 'Failed to add fixture to project' }),
      );
    });
  });

  it('shows an error when delete fails', async () => {
    const existing = projectFixture({ publicId: 'pf-a', name: 'PAR 64', startAddress: 1 });
    const { user } = renderWithProviders(<ProjectFixtureTable projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: {
            data: {
              project: { ...emptyProject, projectFixtures: [existing] },
            },
          },
        },
        {
          request: { query: GetFixturesDocument },
          result: { data: { fixtures: [] } },
        },
        {
          request: {
            query: DeleteProjectFixtureDocument,
            variables: { publicId: 'pf-a' },
          },
          error: new Error('network'),
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByText('PAR 64')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Remove fixture from project' }));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Remove fixture from project' }),
    );

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'red', message: 'Failed to remove fixture from project' }),
      );
    });
  });

  it('shows an error when update fails', async () => {
    const existing = projectFixture({ publicId: 'pf-a', name: 'PAR 64', startAddress: 1 });
    const { user } = renderWithProviders(<ProjectFixtureTable projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: {
            data: {
              project: { ...emptyProject, projectFixtures: [existing] },
            },
          },
        },
        {
          request: { query: GetFixturesDocument },
          result: { data: { fixtures: [catalogFixture] } },
        },
        {
          request: {
            query: UpdateProjectFixtureDocument,
            variables: {
              input: {
                publicId: 'pf-a',
                channelModePublicId: 'mode-pf-a',
                startAddress: 20,
              },
            },
          },
          error: new Error('network'),
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByText('PAR 64')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Edit project fixture' }));
    const dialog = await screen.findByRole('dialog');
    const startAddressInput = screen.getByRole('textbox', { name: 'Start address' });
    await user.clear(startAddressInput);
    await user.type(startAddressInput, '20');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'red', message: 'Failed to update project fixture' }),
      );
    });
  });

  it('closes the create form when cancel is clicked', async () => {
    const { user } = renderWithProviders(<ProjectFixtureTable projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project: emptyProject } },
        },
        {
          request: { query: GetFixturesDocument },
          result: { data: { fixtures: [] } },
        },
      ],
    });

    await user.click(await screen.findByRole('button', { name: 'Add fixture' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(screen.queryByText('Select a fixture')).not.toBeInTheDocument();
    });
  });
});
