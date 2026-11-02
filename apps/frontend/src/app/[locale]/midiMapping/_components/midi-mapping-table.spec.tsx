import {
  CreateMidiMappingDocument,
  DeleteMidiMappingDocument,
  GetMidiMappingsDocument,
} from '@/shared/types/graphql/graphql';
import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { screen, waitFor, within } from '@testing-library/react';
import { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MidiMappingTable from './midi-mapping-table';

const push = vi.hoisted(() => vi.fn());

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
    columns: { accessor: string; render?: (record: Record<string, unknown>) => ReactNode }[];
    onRowClick: (row: { record: Record<string, unknown> }) => void;
  }) => (
    <table>
      <tbody>
        {records.map(record => (
          <tr
            key={String(record.publicId)}
            onClick={() => {
              onRowClick({ record });
            }}
          >
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

const now = new Date('2026-01-01T00:00:00.000Z');
const apc = {
  __typename: 'MidiMappingDto' as const,
  publicId: 'midi-1',
  name: 'APC mini mk2',
  createdAt: now,
  updatedAt: now,
  entries: [],
};
const listQuery = (midiMappings: unknown[]) => ({
  request: { query: GetMidiMappingsDocument },
  result: { data: { midiMappings } },
});

describe('MidiMappingTable', () => {
  beforeEach(() => {
    push.mockClear();
  });

  it('GIVEN mappings WHEN a row is clicked THEN opens the mapping', async () => {
    const { user } = renderWithProviders(<MidiMappingTable />, { apolloMocks: [listQuery([apc])] });

    await user.click(await screen.findByText('APC mini mk2'));
    expect(push).toHaveBeenCalledWith('/midiMapping/midi-1');
  });

  it('GIVEN a name WHEN a mapping is created THEN navigates to it', async () => {
    const { user } = renderWithProviders(<MidiMappingTable />, {
      apolloMocks: [
        listQuery([]),
        {
          request: { query: CreateMidiMappingDocument, variables: { name: 'Launchpad' } },
          result: { data: { createMidiMapping: { ...apc, publicId: 'midi-2', name: 'Launchpad' } } },
        },
        listQuery([apc]),
      ],
    });

    await user.click(await screen.findByRole('button', { name: 'Add MIDI mapping' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Name'), ' Launchpad {Enter}');

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/midiMapping/midi-2');
    });
  });

  it('GIVEN a mapping WHEN delete is confirmed THEN deletes it without opening it', async () => {
    const deleted = vi.fn(() => ({ data: { deleteMidiMapping: { publicId: 'midi-1', deleted: true } } }));
    const { user } = renderWithProviders(<MidiMappingTable />, {
      apolloMocks: [
        listQuery([apc]),
        { request: { query: DeleteMidiMappingDocument, variables: { publicId: 'midi-1' } }, result: deleted },
      ],
    });

    await user.click(await screen.findByRole('button', { name: 'Delete MIDI mapping' }));
    expect(push).not.toHaveBeenCalled();
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete MIDI mapping' }));

    await waitFor(() => {
      expect(deleted).toHaveBeenCalled();
    });
  });
});
