import { renderWithProviders } from '@/testhelpers/render-with-providers';
import {
  ExportFixturesDocument,
  GetFixtureVendorsDocument,
  GetFixturesDocument,
  ImportFixturesDocument,
} from '@/shared/types/graphql/graphql';
import { notifications } from '@mantine/notifications';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FixtureListToolbar from './fixture-list-toolbar';

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

vi.mock('./download-json-file', () => ({
  downloadJsonFile: vi.fn(),
}));

const exportDocument = {
  schemaVersion: 1,
  vendors: [],
  fixtures: [],
};

function fileInput(): HTMLInputElement {
  const input = window.document.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('Expected a file input');
  }
  return input;
}

describe('FixtureListToolbar', () => {
  beforeEach(() => {
    vi.mocked(notifications.show).mockClear();
  });

  it('exports fixtures as JSON', async () => {
    const { downloadJsonFile } = await import('./download-json-file');
    const { user } = renderWithProviders(<FixtureListToolbar />, {
      apolloMocks: [
        {
          request: { query: ExportFixturesDocument },
          result: { data: { exportFixtures: exportDocument } },
        },
      ],
    });

    await user.click(screen.getByRole('button', { name: 'Export fixtures' }));

    await waitFor(() => {
      expect(downloadJsonFile).toHaveBeenCalledWith('fixtures.json', exportDocument);
    });
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'green', title: 'Fixtures exported' }),
    );
  });

  it('shows an error notification when export fails', async () => {
    const { user } = renderWithProviders(<FixtureListToolbar />, {
      apolloMocks: [
        {
          request: { query: ExportFixturesDocument },
          error: new Error('network'),
        },
      ],
    });

    await user.click(screen.getByRole('button', { name: 'Export fixtures' }));

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'red', message: 'Failed to export fixtures' }),
      );
    });
  });

  it('imports a JSON file and refetches fixtures', async () => {
    const importDocument = { schemaVersion: 1, fixtures: [] };
    const { user } = renderWithProviders(<FixtureListToolbar />, {
      apolloMocks: [
        {
          request: { query: ImportFixturesDocument, variables: { document: importDocument } },
          result: { data: { importFixtures: { importedCount: 0, fixtures: [] } } },
        },
        {
          request: { query: GetFixturesDocument },
          result: { data: { fixtures: [] } },
        },
        {
          request: { query: GetFixtureVendorsDocument },
          result: { data: { fixtureVendors: [] } },
        },
      ],
    });

    const file = new File([JSON.stringify(importDocument)], 'fixtures.json', { type: 'application/json' });
    await user.upload(fileInput(), file);

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'green', title: 'Fixtures imported', message: 'fixtures.json' }),
      );
    });
  });

  it('shows an error notification when the selected file is not JSON', async () => {
    const { user } = renderWithProviders(<FixtureListToolbar />, { apolloMocks: [] });
    const file = new File(['not json'], 'fixtures.json', { type: 'application/json' });
    await user.upload(fileInput(), file);

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'red', message: 'Failed to import fixtures' }),
      );
    });
  });
});
