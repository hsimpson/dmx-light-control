import { renderWithProviders } from '@/testhelpers/render-with-providers';
import {
  CreateProjectDocument,
  DeleteProjectDocument,
  GetProjectsDocument,
  UpdateProjectDocument,
} from '@/shared/types/graphql/graphql';
import { notifications } from '@mantine/notifications';
import { screen, waitFor, within } from '@testing-library/react';
import { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectTable from './project-table';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

vi.mock('mantine-datatable', () => ({
  DataTable: ({
    records,
    columns,
  }: {
    records: Record<string, unknown>[];
    columns: {
      accessor: string;
      render?: (record: Record<string, unknown>) => ReactNode;
    }[];
  }) => (
    <table>
      <tbody>
        {records.map(record => (
          <tr key={String(record.publicId)}>
            {columns.map(column => {
              const cell = column.render
                ? column.render(record)
                : column.accessor.split('.').reduce<unknown>((value, key) => {
                    return (value as Record<string, unknown> | undefined)?.[key];
                  }, record);

              return <td key={column.accessor}>{cell as ReactNode}</td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

const now = new Date('2026-01-01T00:00:00.000Z');

const project = {
  __typename: 'ProjectDto',
  publicId: 'proj-1',
  name: 'Main Show',
  createdAt: now,
  updatedAt: now,
};

const projectsQueryMock = {
  request: { query: GetProjectsDocument },
  result: { data: { projects: [project] } },
};

describe('ProjectTable', () => {
  beforeEach(() => {
    vi.mocked(notifications.show).mockClear();
  });

  it('shows a loader while the projects query is in flight', () => {
    renderWithProviders(<ProjectTable />, {
      apolloMocks: [
        {
          request: { query: GetProjectsDocument },
          result: { data: { projects: [] } },
          delay: Number.POSITIVE_INFINITY,
        },
      ],
    });

    expect(document.querySelector('.mantine-Loader-root')).not.toBeNull();
  });

  it('renders an empty table when the query returns no projects', async () => {
    renderWithProviders(<ProjectTable />, {
      apolloMocks: [
        {
          request: { query: GetProjectsDocument },
          result: { data: { projects: [] } },
        },
      ],
    });

    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.queryByText('Main Show')).not.toBeInTheDocument();
  });

  it('renders the project name from the query', async () => {
    renderWithProviders(<ProjectTable />, {
      apolloMocks: [projectsQueryMock],
    });

    expect(await screen.findByText('Main Show')).toBeInTheDocument();
  });

  it('creates a project from the create modal', async () => {
    const { user } = renderWithProviders(<ProjectTable />, {
      apolloMocks: [
        projectsQueryMock,
        {
          request: { query: CreateProjectDocument, variables: { name: 'Club Night' } },
          result: {
            data: {
              createProject: {
                __typename: 'ProjectDto',
                publicId: 'proj-2',
                name: 'Club Night',
                createdAt: now,
                updatedAt: now,
              },
            },
          },
        },
      ],
    });

    expect(await screen.findByText('Main Show')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add project' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Name'), 'Club Night');
    await user.click(within(dialog).getByRole('button', { name: 'Add project' }));

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'green',
          title: 'Project created',
          message: 'Club Night',
        }),
      );
    });
  });

  it('does not create a project when the name is whitespace', async () => {
    const { user } = renderWithProviders(<ProjectTable />, {
      apolloMocks: [projectsQueryMock],
    });

    expect(await screen.findByText('Main Show')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add project' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Name'), '   ');
    expect(within(dialog).getByRole('button', { name: 'Add project' })).toBeDisabled();
    expect(notifications.show).not.toHaveBeenCalled();
  });

  it('renames a project from the rename modal', async () => {
    const { user } = renderWithProviders(<ProjectTable />, {
      apolloMocks: [
        projectsQueryMock,
        {
          request: {
            query: UpdateProjectDocument,
            variables: { input: { publicId: 'proj-1', name: 'Club Night' } },
          },
          result: {
            data: {
              updateProject: {
                __typename: 'ProjectDto',
                publicId: 'proj-1',
                name: 'Club Night',
                createdAt: now,
                updatedAt: now,
              },
            },
          },
        },
      ],
    });

    expect(await screen.findByText('Main Show')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Rename project' }));
    const dialog = await screen.findByRole('dialog');
    const input = within(dialog).getByLabelText('Name');
    expect(input).toHaveValue('Main Show');
    await user.clear(input);
    await user.type(input, 'Club Night');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'green',
          title: 'Project renamed',
          message: 'Club Night',
        }),
      );
    });
  });

  it('opens a confirm modal from trash', async () => {
    const { user } = renderWithProviders(<ProjectTable />, {
      apolloMocks: [projectsQueryMock],
    });

    expect(await screen.findByText('Main Show')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete project' }));

    expect(await screen.findByText('Delete project?')).toBeInTheDocument();
  });

  it('deletes a project after confirm', async () => {
    const { user } = renderWithProviders(<ProjectTable />, {
      apolloMocks: [
        projectsQueryMock,
        {
          request: { query: DeleteProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { deleteProject: { publicId: 'proj-1', deleted: true } } },
        },
      ],
    });

    expect(await screen.findByText('Main Show')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete project' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete project' }));

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'green',
          title: 'Project deleted',
          message: 'Main Show',
        }),
      );
    });
  });

  it('shows an error notification when delete fails', async () => {
    const { user } = renderWithProviders(<ProjectTable />, {
      apolloMocks: [
        projectsQueryMock,
        {
          request: { query: DeleteProjectDocument, variables: { publicId: 'proj-1' } },
          error: new Error('network'),
        },
      ],
    });

    expect(await screen.findByText('Main Show')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete project' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete project' }));

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'red',
          message: 'Failed to delete project',
        }),
      );
    });
  });
});
