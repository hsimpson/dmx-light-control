import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { GetProjectDocument, UpdateProjectDocument } from '@/shared/types/graphql/graphql';
import { notifications } from '@mantine/notifications';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ThreeDView from './three-d-view';

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

vi.mock('./three-d-room-canvas', () => ({
  default: () => <div data-testid="three-d-room-canvas" />,
}));

const now = new Date('2026-01-01T00:00:00.000Z');

const project = {
  __typename: 'ProjectDto' as const,
  publicId: 'proj-1',
  name: 'Main Show',
  roomWidth: 10,
  roomLength: 8,
  roomHeight: 5,
  createdAt: now,
  updatedAt: now,
  projectFixtures: [],
};

describe('ThreeDView', () => {
  beforeEach(() => {
    vi.mocked(notifications.show).mockClear();
  });

  it('saves room dimensions with the project name', async () => {
    const { user } = renderWithProviders(<ThreeDView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project } },
        },
        {
          request: {
            query: UpdateProjectDocument,
            variables: {
              input: {
                publicId: 'proj-1',
                name: 'Main Show',
                roomWidth: 10,
                roomLength: 8,
                roomHeight: 5,
              },
            },
          },
          result: {
            data: {
              updateProject: {
                ...project,
                roomWidth: 10,
                roomLength: 8,
                roomHeight: 5,
              },
            },
          },
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Width')).toHaveValue('10 m');
    });

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({ color: 'green' }));
    });
  });
});
