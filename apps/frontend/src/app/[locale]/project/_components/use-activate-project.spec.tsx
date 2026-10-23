import { dmxStore, resetDmxStore } from '@/lib/dmx/dmx-store';
import { ActivateProjectDocument } from '@/shared/types/graphql/graphql';
import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { act, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useActivateProject } from './use-activate-project';

const { showNotification } = vi.hoisted(() => ({ showNotification: vi.fn() }));

vi.mock('@mantine/notifications', () => ({ notifications: { show: showNotification } }));

const ActivateProject = ({ publicId }: { publicId?: string }) => {
  useActivateProject(publicId);
  return null;
};

const activation = (result: () => unknown) => ({
  request: { query: ActivateProjectDocument, variables: { publicId: 'proj-1' } },
  result,
});

const activated = () => ({
  data: { activateProject: { __typename: 'ProjectDto' as const, publicId: 'proj-1' } },
});

describe('useActivateProject', () => {
  afterEach(() => {
    resetDmxStore();
    showNotification.mockClear();
  });

  it('GIVEN a project route WHEN mounted THEN the project is activated', async () => {
    const result = vi.fn(activated);

    renderWithProviders(<ActivateProject publicId="proj-1" />, { apolloMocks: [activation(result)] });

    await waitFor(() => {
      expect(result).toHaveBeenCalledTimes(1);
    });
  });

  it('GIVEN an activated project WHEN the DMX socket reconnects THEN it is activated again', async () => {
    const first = vi.fn(activated);
    const second = vi.fn(activated);
    renderWithProviders(<ActivateProject publicId="proj-1" />, {
      apolloMocks: [activation(first), activation(second)],
    });
    await waitFor(() => {
      expect(first).toHaveBeenCalled();
    });

    act(() => {
      dmxStore.getState().setStatus('open');
    });

    await waitFor(() => {
      expect(second).toHaveBeenCalledTimes(1);
    });
  });

  it('GIVEN no project id WHEN mounted THEN nothing is activated', async () => {
    const result = vi.fn(activated);

    renderWithProviders(<ActivateProject />, { apolloMocks: [activation(result)] });

    await new Promise(resolve => setTimeout(resolve, 20));
    expect(result).not.toHaveBeenCalled();
  });

  it('GIVEN activation fails WHEN mounted THEN the user is notified', async () => {
    renderWithProviders(<ActivateProject publicId="proj-1" />, {
      apolloMocks: [
        { request: { query: ActivateProjectDocument, variables: { publicId: 'proj-1' } }, error: new Error('down') },
      ],
    });

    await waitFor(() => {
      expect(showNotification).toHaveBeenCalledWith(expect.objectContaining({ color: 'red' }));
    });
  });
});
