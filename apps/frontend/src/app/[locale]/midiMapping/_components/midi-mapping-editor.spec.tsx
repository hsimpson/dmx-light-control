import {
  AddMidiMappingEntryDocument,
  DeleteMidiMappingEntryDocument,
  GetMidiMappingDocument,
  MidiControlType,
  MidiMessageType,
  UpdateMidiMappingDocument,
  UpdateMidiMappingEntryDocument,
} from '@/shared/types/graphql/graphql';
import { dmxStore, resetDmxStore } from '@/lib/dmx/dmx-store';
import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { act, screen, waitFor, within } from '@testing-library/react';
import { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MidiMappingEditor from './midi-mapping-editor';

// The Learn dialog opens the live /dmx socket; MIDI input is driven through the store instead.
vi.mock('@/lib/dmx/dmx-socket-connector', () => ({
  DmxSocketConnector: () => null,
}));

vi.mock('mantine-datatable', () => ({
  DataTable: ({
    records,
    columns,
  }: {
    records: Record<string, unknown>[];
    columns: { accessor: string; render?: (record: Record<string, unknown>) => ReactNode }[];
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

const now = new Date('2026-01-01T00:00:00.000Z');
const feedback = {
  __typename: 'MidiFeedbackDto' as const,
  off: { __typename: 'MidiLedStateDto' as const, behavior: 0, color: 0 },
  on: { __typename: 'MidiLedStateDto' as const, behavior: 0, color: 1 },
};
const trackButton1 = {
  __typename: 'MidiMappingEntryDto' as const,
  publicId: 'entry-1',
  name: 'Track Button 1',
  controlType: MidiControlType.Button,
  messageType: MidiMessageType.Note,
  channel: 0,
  number: 100,
  feedback,
};
const mapping = {
  __typename: 'MidiMappingDto' as const,
  publicId: 'midi-1',
  name: 'APC mini mk2',
  createdAt: now,
  updatedAt: now,
  entries: [trackButton1],
};
const refetch = (entries: unknown[]) => ({
  request: { query: GetMidiMappingDocument, variables: { publicId: 'midi-1' } },
  result: { data: { midiMapping: { ...mapping, entries } } },
});

describe('MidiMappingEditor', () => {
  afterEach(() => {
    resetDmxStore();
  });

  it('GIVEN learn is active WHEN a fader moves THEN its address fills the form once', async () => {
    const { user } = renderWithProviders(<MidiMappingEditor mapping={mapping} />, { apolloMocks: [] });

    await user.click(screen.getByRole('button', { name: 'Add control' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Learn' }));
    expect(within(dialog).getByRole('button', { name: 'Press a control…' })).toBeInTheDocument();

    act(() => {
      dmxStore.getState().setLastMidiInput({ portName: 'APC', message: [0x80, 0x64, 0] });
    });
    expect(within(dialog).getByRole('button', { name: 'Press a control…' })).toBeInTheDocument();

    act(() => {
      dmxStore.getState().setLastMidiInput({ portName: 'APC', message: [0xb1, 48, 10] });
    });
    expect(within(dialog).getByLabelText('Channel (0-15)')).toHaveValue('1');
    expect(within(dialog).getByLabelText('Note / controller (0-127)')).toHaveValue('48');
    expect(within(dialog).getByLabelText('Type')).toHaveValue('Slider');
    expect(within(dialog).getByRole('button', { name: 'Learn' })).toBeInTheDocument();

    act(() => {
      dmxStore.getState().setLastMidiInput({ portName: 'APC', message: [0x90, 0x10, 0x7f] });
    });
    expect(within(dialog).getByLabelText('Note / controller (0-127)')).toHaveValue('48');
  });

  it('GIVEN a mapping WHEN rendered THEN lists its controls with address and feedback', () => {
    renderWithProviders(<MidiMappingEditor mapping={mapping} />, { apolloMocks: [] });

    expect(screen.getByText('Track Button 1')).toBeInTheDocument();
    expect(screen.getByText('Note 0 / 100')).toBeInTheDocument();
    expect(screen.getByText('0/0 → 0/1')).toBeInTheDocument();
  });

  it('GIVEN a new name WHEN saved THEN renames the mapping', async () => {
    const updated = vi.fn(() => ({ data: { updateMidiMapping: { ...mapping, name: 'APC' } } }));
    const { user } = renderWithProviders(<MidiMappingEditor mapping={mapping} />, {
      apolloMocks: [
        {
          request: { query: UpdateMidiMappingDocument, variables: { input: { publicId: 'midi-1', name: 'APC' } } },
          result: updated,
        },
      ],
    });

    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();
    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), ' APC ');
    await user.click(save);

    await waitFor(() => {
      expect(updated).toHaveBeenCalled();
    });
  });

  it('GIVEN an existing control WHEN its feedback is switched off THEN updates it with null feedback', async () => {
    const updated = vi.fn(() => ({ data: { updateMidiMappingEntry: { ...trackButton1, feedback: null } } }));
    const { user } = renderWithProviders(<MidiMappingEditor mapping={mapping} />, {
      apolloMocks: [
        {
          request: {
            query: UpdateMidiMappingEntryDocument,
            variables: {
              input: {
                publicId: 'entry-1',
                name: 'Track Button 1',
                controlType: MidiControlType.Button,
                messageType: MidiMessageType.Note,
                channel: 0,
                number: 100,
                feedback: null,
              },
            },
          },
          result: updated,
        },
      ],
    });

    await user.click(screen.getByRole('button', { name: 'Edit control' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('On: Color (velocity 0-127)')).toHaveValue('1');
    await user.click(within(dialog).getByLabelText('LED feedback'));
    expect(within(dialog).queryByLabelText('On: Color (velocity 0-127)')).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(updated).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('GIVEN the add dialog WHEN a control is saved THEN adds it to the mapping', async () => {
    const fader = {
      ...trackButton1,
      publicId: 'entry-2',
      name: 'Fader 1',
      feedback: null,
    };
    const added = vi.fn(() => ({ data: { addMidiMappingEntry: fader } }));
    const { user } = renderWithProviders(<MidiMappingEditor mapping={mapping} />, {
      apolloMocks: [
        {
          request: {
            query: AddMidiMappingEntryDocument,
            variables: {
              input: {
                midiMappingPublicId: 'midi-1',
                name: 'Fader 1',
                controlType: MidiControlType.Button,
                messageType: MidiMessageType.Note,
                channel: 0,
                number: 100,
                feedback: null,
              },
            },
          },
          result: added,
        },
        refetch([trackButton1, fader]),
      ],
    });

    await user.click(screen.getByRole('button', { name: 'Add control' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeDisabled();
    await user.type(within(dialog).getByLabelText('Name'), 'Fader 1');
    await user.clear(within(dialog).getByLabelText('Note / controller (0-127)'));
    await user.type(within(dialog).getByLabelText('Note / controller (0-127)'), '100');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(added).toHaveBeenCalled();
    });
  });

  it('GIVEN a control WHEN deleted THEN removes it', async () => {
    const deleted = vi.fn(() => ({ data: { deleteMidiMappingEntry: { publicId: 'entry-1', deleted: true } } }));
    const { user } = renderWithProviders(<MidiMappingEditor mapping={mapping} />, {
      apolloMocks: [
        { request: { query: DeleteMidiMappingEntryDocument, variables: { publicId: 'entry-1' } }, result: deleted },
        refetch([]),
      ],
    });

    await user.click(screen.getByRole('button', { name: 'Delete control' }));

    await waitFor(() => {
      expect(deleted).toHaveBeenCalled();
    });
  });
});
