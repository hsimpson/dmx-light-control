import { GetProjectDocument, UpdateProjectVirtualConsoleDocument } from '@/shared/types/graphql/graphql';
import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { notifications } from '@mantine/notifications';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VirtualConsoleView from './virtual-console-view';

vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'en', publicId: 'proj-1' }),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

const now = new Date('2026-01-01T00:00:00.000Z');
const pageId = '11111111-1111-4111-8111-111111111111';

const virtualConsole = {
  schemaVersion: 1,
  width: 1280,
  height: 720,
  pages: [{ id: pageId, name: 'Page 1', controls: [] }],
};

const project = {
  publicId: 'proj-1',
  name: 'Show',
  environmentType: 'SimpleGround',
  roomWidth: 10,
  roomLength: 8,
  roomHeight: 5,
  virtualConsole,
  projectFixtures: [],
  project3dObjects: [],
  createdAt: now,
  updatedAt: now,
};

describe('VirtualConsoleView', () => {
  beforeEach(() => {
    vi.mocked(notifications.show).mockClear();
  });

  it('adds a page and keeps at least one page', async () => {
    const { user } = renderWithProviders(<VirtualConsoleView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project } },
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Page 1' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Add page' }));
    expect(screen.getByRole('tab', { name: 'Page 2' })).toBeInTheDocument();

    const deletePage = screen.getAllByLabelText('Delete page').at(0);
    expect(deletePage).toBeDefined();
    if (deletePage) {
      await user.click(deletePage);
    }
    expect(screen.getByRole('tab', { name: 'Page 2' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Delete page')).not.toBeInTheDocument();
  });

  it('does not save until Save is clicked', async () => {
    const { user } = renderWithProviders(<VirtualConsoleView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project } },
        },
        {
          request: {
            query: UpdateProjectVirtualConsoleDocument,
            variables: {
              input: {
                publicId: 'proj-1',
                virtualConsole: { ...virtualConsole, width: 1024 },
              },
            },
          },
          result: {
            data: { updateProjectVirtualConsole: { ...project, virtualConsole: { ...virtualConsole, width: 1024 } } },
          },
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });

    await user.click(screen.getByText('Canvas'));
    const width = screen.getByLabelText('Width');
    await user.clear(width);
    await user.type(width, '1024');
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('hides the palette in play mode', async () => {
    renderWithProviders(<VirtualConsoleView mode="play" projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project } },
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Fullscreen' })).toBeInTheDocument();
    });
    expect(screen.queryByText('Add control')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });
});
