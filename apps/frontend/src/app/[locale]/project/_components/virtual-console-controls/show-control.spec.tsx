import { dmxStore, resetDmxStore } from '@/lib/dmx/dmx-store';
import { GetShowsDocument } from '@/shared/types/graphql/graphql';
import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createControl } from '../virtual-console-document';
import ShowControl from './show-control';

const socket = vi.hoisted(() => ({ playShow: vi.fn(), pauseShow: vi.fn(), stopShow: vi.fn() }));

vi.mock('@/lib/dmx/dmx-socket-connector', () => ({ getDmxWebsocketClient: () => socket }));
vi.mock('next/navigation', () => ({ useParams: () => ({ publicId: 'proj-1' }) }));

const SHOW_ID = '5f0c1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a5b';

const showsQuery = {
  request: { query: GetShowsDocument, variables: { projectPublicId: 'proj-1' } },
  result: {
    data: {
      shows: [
        {
          __typename: 'ShowDto' as const,
          publicId: SHOW_ID,
          name: 'Opening',
          durationMs: 200_000,
          beatsMs: [],
          audioClips: [],
          lightTracks: [],
        },
      ],
    },
  },
};

const control = { ...createControl('show', 0, 0), label: 'Opener', showPublicId: SHOW_ID };

describe('ShowControl', () => {
  afterEach(() => {
    resetDmxStore();
    vi.clearAllMocks();
  });

  it('GIVEN a stopped show WHEN played from the console THEN it shows the total and starts at the beginning', async () => {
    const { user } = renderWithProviders(<ShowControl control={control} mode="play" />, { apolloMocks: [showsQuery] });

    expect(await screen.findByText('0:00 / 3:20')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Play' }));

    expect(socket.playShow).toHaveBeenCalledWith(SHOW_ID, undefined);
  });

  it('GIVEN the show plays WHEN rendered THEN elapsed and remaining time follow the backend and Stop stops it', async () => {
    dmxStore
      .getState()
      .setShowPlayback({ showPublicId: SHOW_ID, status: 'playing', positionMs: 65_000, durationMs: 200_000 });
    const { user } = renderWithProviders(<ShowControl control={control} mode="play" />, { apolloMocks: [showsQuery] });

    expect(screen.getByLabelText('Elapsed')).toHaveTextContent('1:05 / 3:20');
    expect(screen.getByLabelText('Remaining')).toHaveTextContent('-2:15');
    await user.click(screen.getByRole('button', { name: 'Stop' }));

    expect(socket.stopShow).toHaveBeenCalledTimes(1);
  });

  it('GIVEN edit mode WHEN rendered THEN the transport does not catch the pointer', () => {
    renderWithProviders(<ShowControl control={control} mode="edit" />, { apolloMocks: [showsQuery] });

    expect(screen.getByTestId('virtual-console-show')).toHaveStyle({ pointerEvents: 'none' });
  });

  it('GIVEN no show picked WHEN rendered THEN it says so instead of a transport', () => {
    renderWithProviders(<ShowControl control={{ ...control, showPublicId: undefined }} mode="play" />, {
      apolloMocks: [],
    });

    expect(screen.getByText('No show selected')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Play' })).not.toBeInTheDocument();
  });
});
