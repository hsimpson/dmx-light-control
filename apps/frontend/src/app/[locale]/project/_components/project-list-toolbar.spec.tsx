import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { ExportProjectsDocument, GetProjectsDocument, ImportProjectsDocument } from '@/shared/types/graphql/graphql';
import { notifications } from '@mantine/notifications';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectListToolbar from './project-list-toolbar';

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

vi.mock('@/app/[locale]/fixture/_components/download-json-file', () => ({
  downloadJsonFile: vi.fn(),
}));

const exportDocument = {
  schemaVersion: 1,
  projects: [],
};

function fileInput(): HTMLInputElement {
  const input = window.document.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('Expected a file input');
  }
  return input;
}

describe('ProjectListToolbar', () => {
  beforeEach(() => {
    vi.mocked(notifications.show).mockClear();
  });

  it('exports projects as JSON', async () => {
    const { downloadJsonFile } = await import('@/app/[locale]/fixture/_components/download-json-file');
    const { user } = renderWithProviders(<ProjectListToolbar />, {
      apolloMocks: [
        {
          request: { query: ExportProjectsDocument },
          result: { data: { exportProjects: exportDocument } },
        },
      ],
    });

    await user.click(screen.getByRole('button', { name: 'Export projects' }));

    await waitFor(() => {
      expect(downloadJsonFile).toHaveBeenCalledWith('projects.json', exportDocument);
    });
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'green', title: 'Projects exported' }),
    );
  });

  it('shows an error notification when export fails', async () => {
    const { user } = renderWithProviders(<ProjectListToolbar />, {
      apolloMocks: [
        {
          request: { query: ExportProjectsDocument },
          error: new Error('network'),
        },
      ],
    });

    await user.click(screen.getByRole('button', { name: 'Export projects' }));

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'red', message: 'Failed to export projects' }),
      );
    });
  });

  it('imports a JSON file and refetches projects', async () => {
    const importDocument = { schemaVersion: 1, projects: [] };
    const { user } = renderWithProviders(<ProjectListToolbar />, {
      apolloMocks: [
        {
          request: { query: ImportProjectsDocument, variables: { document: importDocument } },
          result: { data: { importProjects: { importedCount: 0, projects: [] } } },
        },
        {
          request: { query: GetProjectsDocument },
          result: { data: { projects: [] } },
        },
      ],
    });

    const file = new File([JSON.stringify(importDocument)], 'projects.json', { type: 'application/json' });
    await user.upload(fileInput(), file);

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'green', title: 'Projects imported', message: 'projects.json' }),
      );
    });
  });

  it('shows an error notification when the selected file is not JSON', async () => {
    const { user } = renderWithProviders(<ProjectListToolbar />, { apolloMocks: [] });
    const file = new File(['not json'], 'projects.json', { type: 'application/json' });
    await user.upload(fileInput(), file);

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'red', message: 'Failed to import projects' }),
      );
    });
  });
});
