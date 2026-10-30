import {
  ExportMidiMappingsDocument,
  GetMidiMappingsDocument,
  ImportMidiMappingsDocument,
} from '@/shared/types/graphql/graphql';
import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { CombinedGraphQLErrors } from '@apollo/client';
import { notifications } from '@mantine/notifications';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MidiMappingListToolbar from './midi-mapping-list-toolbar';

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

vi.mock('@/lib/download-json-file', () => ({
  downloadJsonFile: vi.fn(),
}));

const document = { schemaVersion: 1, mappings: [] };

function fileInput(): HTMLInputElement {
  const input = window.document.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('Expected a file input');
  }
  return input;
}

const upload = async (user: ReturnType<typeof renderWithProviders>['user']) => {
  await user.upload(
    fileInput(),
    new File([JSON.stringify(document)], 'midi-mappings.json', { type: 'application/json' }),
  );
};

describe('MidiMappingListToolbar', () => {
  beforeEach(() => {
    vi.mocked(notifications.show).mockClear();
  });

  it('GIVEN mappings WHEN exported THEN the document is downloaded as midi-mappings.json', async () => {
    const { downloadJsonFile } = await import('@/lib/download-json-file');
    const { user } = renderWithProviders(<MidiMappingListToolbar />, {
      apolloMocks: [
        { request: { query: ExportMidiMappingsDocument }, result: { data: { exportMidiMappings: document } } },
      ],
    });

    await user.click(screen.getByRole('button', { name: 'Export MIDI mappings' }));

    await waitFor(() => {
      expect(downloadJsonFile).toHaveBeenCalledWith('midi-mappings.json', document);
    });
  });

  it('GIVEN the export fails WHEN exported THEN an error is shown', async () => {
    const { user } = renderWithProviders(<MidiMappingListToolbar />, {
      apolloMocks: [{ request: { query: ExportMidiMappingsDocument }, error: new Error('network') }],
    });

    await user.click(screen.getByRole('button', { name: 'Export MIDI mappings' }));

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'red', message: 'Failed to export MIDI mappings' }),
      );
    });
  });

  it('GIVEN a JSON file WHEN imported THEN it is sent and the list refetched', async () => {
    const refetched = vi.fn(() => ({ data: { midiMappings: [] } }));
    const { user } = renderWithProviders(<MidiMappingListToolbar />, {
      apolloMocks: [
        {
          request: { query: ImportMidiMappingsDocument, variables: { document } },
          result: { data: { importMidiMappings: { importedCount: 0, mappings: [] } } },
        },
        { request: { query: GetMidiMappingsDocument }, result: refetched },
      ],
    });

    await upload(user);

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'green', title: 'MIDI mappings imported', message: 'midi-mappings.json' }),
      );
    });
    await waitFor(() => {
      expect(refetched).toHaveBeenCalled();
    });
  });

  it('GIVEN a conflicting file WHEN imported THEN the GraphQL error message is shown', async () => {
    const { user } = renderWithProviders(<MidiMappingListToolbar />, {
      apolloMocks: [
        {
          request: { query: ImportMidiMappingsDocument, variables: { document } },
          error: new CombinedGraphQLErrors({ errors: [{ message: 'A mapping reuses a name' }] }),
        },
      ],
    });

    await upload(user);

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'red', message: 'A mapping reuses a name' }),
      );
    });
  });
});
