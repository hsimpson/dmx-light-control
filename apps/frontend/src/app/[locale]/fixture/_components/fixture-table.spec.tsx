import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { DeleteFixtureDocument, GetFixturesDocument } from '@/shared/types/graphql/graphql';
import { notifications } from '@mantine/notifications';
import { screen, waitFor, within } from '@testing-library/react';
import { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FixtureTable from './fixture-table';

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

const fixturesQueryMock = {
  request: { query: GetFixturesDocument },
  result: { data: { fixtures: [fixture] } },
};

describe('FixtureTable', () => {
  beforeEach(() => {
    push.mockClear();
    vi.mocked(notifications.show).mockClear();
  });

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

  it('sorts fixtures by vendor ascending by default', async () => {
    const zebraFixture = {
      ...fixture,
      publicId: 'fix-2',
      name: 'Zebra Spot',
      fixtureVendor: {
        ...fixture.fixtureVendor,
        name: 'Zebra Lights',
      },
    };
    const alphaFixture = {
      ...fixture,
      publicId: 'fix-3',
      name: 'Alpha Spot',
      fixtureVendor: {
        ...fixture.fixtureVendor,
        name: 'Alpha Lights',
      },
    };

    renderWithProviders(<FixtureTable />, {
      apolloMocks: [
        {
          request: { query: GetFixturesDocument },
          result: { data: { fixtures: [zebraFixture, alphaFixture] } },
        },
      ],
    });

    const rows = await screen.findAllByRole('row');
    const rowTexts = rows.map(row => row.textContent);

    expect(rowTexts[0]).toContain('Alpha Lights');
    expect(rowTexts[1]).toContain('Zebra Lights');
  });

  it('renders vendor, fixture name, and channel modes from the query', async () => {
    const { user } = renderWithProviders(<FixtureTable />, {
      apolloMocks: [fixturesQueryMock],
    });

    expect(await screen.findByText('Acme Lights')).toBeInTheDocument();
    expect(screen.getByText('Spot 250')).toBeInTheDocument();
    expect(screen.getByText('8ch')).toBeInTheDocument();

    await user.click(screen.getByText('Spot 250'));
    expect(push).toHaveBeenCalledWith('/fixture/fix-1');
  });

  it('opens a confirm modal from trash without navigating', async () => {
    const { user } = renderWithProviders(<FixtureTable />, {
      apolloMocks: [fixturesQueryMock],
    });

    expect(await screen.findByText('Spot 250')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete fixture' }));

    expect(push).not.toHaveBeenCalled();
    expect(await screen.findByText('Delete fixture?')).toBeInTheDocument();
  });

  it('deletes a fixture after confirm', async () => {
    const { user } = renderWithProviders(<FixtureTable />, {
      apolloMocks: [
        fixturesQueryMock,
        {
          request: { query: DeleteFixtureDocument, variables: { publicId: 'fix-1' } },
          result: { data: { deleteFixture: { publicId: 'fix-1', deleted: true } } },
        },
      ],
    });

    expect(await screen.findByText('Spot 250')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete fixture' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete fixture' }));

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'green',
          title: 'Fixture deleted',
          message: 'Spot 250',
        }),
      );
    });
  });

  it('shows an error notification when delete fails', async () => {
    const { user } = renderWithProviders(<FixtureTable />, {
      apolloMocks: [
        fixturesQueryMock,
        {
          request: { query: DeleteFixtureDocument, variables: { publicId: 'fix-1' } },
          error: new Error('network'),
        },
      ],
    });

    expect(await screen.findByText('Spot 250')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete fixture' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete fixture' }));

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'red',
          message: 'Failed to delete fixture',
        }),
      );
    });
  });
});
