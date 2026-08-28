import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { GetFixturesDocument, GetProjectDocument } from '@/shared/types/graphql/graphql';
import { screen, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
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
      render?: (record: Record<string, unknown>) => ReactNode;
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
          records.map(record => (
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
          ))
        )}
      </tbody>
    </table>
  ),
}));

const now = new Date('2026-01-01T00:00:00.000Z');

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
                createdAt: now,
                updatedAt: now,
                projectFixtures: [],
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
});
