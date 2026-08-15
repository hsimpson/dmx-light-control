import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { GetFixturesDocument } from '@/shared/types/graphql/graphql';
import { screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import FixtureTable from './fixture-table';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('mantine-datatable', () => ({
  DataTable: ({
    records,
    columns,
    onRowClick,
  }: {
    records: Record<string, unknown>[];
    columns: {
      accessor: string;
      render?: (record: Record<string, unknown>) => ReactNode;
    }[];
    onRowClick?: (payload: { record: Record<string, unknown> }) => void;
  }) => (
    <table>
      <tbody>
        {records.map(record => (
          <tr
            key={String(record.publicId)}
            onClick={() => {
              onRowClick?.({ record });
            }}
          >
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

const fixture = {
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

describe('FixtureTable', () => {
  it('shows a loader while the fixtures query is in flight', () => {
    renderWithProviders(<FixtureTable />, {
      apolloMocks: [
        {
          request: { query: GetFixturesDocument },
          result: { data: { fixtures: [] } },
          delay: Number.POSITIVE_INFINITY,
        },
      ],
    });

    expect(document.querySelector('.mantine-Loader-root')).not.toBeNull();
  });

  it('renders an empty table when the query returns no fixtures', async () => {
    renderWithProviders(<FixtureTable />, {
      apolloMocks: [
        {
          request: { query: GetFixturesDocument },
          result: { data: { fixtures: [] } },
        },
      ],
    });

    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.queryByText('Spot 250')).not.toBeInTheDocument();
  });

  it('renders vendor, fixture name, and channel modes from the query', async () => {
    const { user } = renderWithProviders(<FixtureTable />, {
      apolloMocks: [
        {
          request: { query: GetFixturesDocument },
          result: { data: { fixtures: [fixture] } },
        },
      ],
    });

    expect(await screen.findByText('Acme Lights')).toBeInTheDocument();
    expect(screen.getByText('Spot 250')).toBeInTheDocument();
    expect(screen.getByText('8ch')).toBeInTheDocument();

    await user.click(screen.getByText('Spot 250'));
    expect(push).toHaveBeenCalledWith('/fixture/fix-1');
  });
});
