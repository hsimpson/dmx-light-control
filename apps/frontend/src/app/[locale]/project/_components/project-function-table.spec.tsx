import { DeleteProjectFunctionDocument, GetProjectDocument } from '@/shared/types/graphql/graphql';
import { mockGetProjectResult, mockVirtualConsoleDto } from '@/testhelpers/mock-project-dto';
import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { screen, waitFor, within } from '@testing-library/react';
import { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectFunctionTable from './project-function-table';

const push = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
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
            {columns.map(column => (
              <td key={column.accessor}>
                {(column.render ? column.render(record) : record[column.accessor]) as ReactNode}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

const chase = {
  __typename: 'ProjectFunctionDto' as const,
  publicId: 'fn-1',
  name: 'Chase',
  type: 'Sequence',
  sequence: {
    __typename: 'SequencePropertiesDto' as const,
    direction: 'Forward',
    runOrder: 'PingPong',
    fixturePublicIds: [],
    steps: [
      { __typename: 'SequenceStepDto' as const, fadeIn: 0, hold: 75, fadeOut: 0, dmxValues: [] },
      { __typename: 'SequenceStepDto' as const, fadeIn: 0, hold: 75, fadeOut: 0, dmxValues: [] },
    ],
  },
};

const projectQuery = (projectFunctions: unknown[] = [chase]) => ({
  request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
  result: mockGetProjectResult({
    projectFunctions,
    virtualConsole: {
      ...mockVirtualConsoleDto,
      pages: [
        {
          __typename: 'VirtualConsolePageDto' as const,
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Page 1',
          controls: [
            {
              __typename: 'VirtualConsoleControlDto' as const,
              id: 'go',
              type: 'button',
              x: 0,
              y: 0,
              width: 80,
              height: 40,
              label: 'Go',
              backgroundColor: null,
              borderWidth: null,
              borderColor: null,
              orientation: null,
              foregroundColor: null,
              fontFamily: null,
              fontSize: null,
              fontWeight: null,
              valueType: null,
              lowerLimit: null,
              upperLimit: null,
              channelBindings: [],
              buttonMode: 'toggle',
              functionPublicId: 'fn-1',
              functionName: 'Chase',
              children: [],
            },
          ],
        },
      ],
    },
  }),
});

describe('ProjectFunctionTable', () => {
  beforeEach(() => {
    push.mockClear();
  });

  it('lists functions and opens the editor', async () => {
    const { user } = renderWithProviders(<ProjectFunctionTable projectPublicId="proj-1" />, {
      apolloMocks: [projectQuery()],
    });

    await waitFor(() => {
      expect(screen.getByText('Chase')).toBeInTheDocument();
    });
    expect(screen.getByText('PingPong')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add function' }));
    expect(push).toHaveBeenCalledWith('/project/proj-1/functions/new');

    await user.click(screen.getByRole('button', { name: 'Edit function' }));
    expect(push).toHaveBeenCalledWith('/project/proj-1/functions/fn-1');
  });

  it('warns about console bindings and deletes the function', async () => {
    const { user } = renderWithProviders(<ProjectFunctionTable projectPublicId="proj-1" />, {
      apolloMocks: [
        projectQuery(),
        {
          request: { query: DeleteProjectFunctionDocument, variables: { publicId: 'fn-1' } },
          result: { data: { deleteProjectFunction: { publicId: 'fn-1', deleted: true } } },
        },
        projectQuery([]),
      ],
    });

    await user.click(await screen.findByRole('button', { name: 'Delete function' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Delete Chase?');
    expect(dialog).toHaveTextContent('Page 1 / Go');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Delete function' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete function' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('shows an empty table without querying when the project id is missing', () => {
    renderWithProviders(<ProjectFunctionTable projectPublicId="" />, { apolloMocks: [] });
    expect(screen.getByRole('button', { name: 'Add function' })).toBeInTheDocument();
    expect(screen.queryByText('Chase')).not.toBeInTheDocument();
  });
});
