import { dmxStore, resetDmxStore } from '@/lib/dmx/dmx-store';
import {
  AddShowDocument,
  GetProjectDocument,
  GetShowsDocument,
  UpdateShowDocument,
} from '@/shared/types/graphql/graphql';
import { mockGetProjectResult } from '@/testhelpers/mock-project-dto';
import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ShowManagerView from './show-manager-view';

const socket = vi.hoisted(() => ({ playShow: vi.fn(), pauseShow: vi.fn(), stopShow: vi.fn() }));

vi.mock('@/lib/dmx/dmx-socket-connector', () => ({
  getDmxWebsocketClient: () => socket,
}));

const SHOW_ID = '5f0c1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a5b';

const chase = {
  __typename: 'ProjectFunctionDto' as const,
  publicId: 'fn-1',
  name: 'Chase',
  type: 'Sequence',
  sequence: null,
};

const show = {
  __typename: 'ShowDto' as const,
  publicId: SHOW_ID,
  name: 'Opening',
  durationMs: 180_000,
  beatsMs: [500, 1000, 1500],
  audioClips: [
    {
      __typename: 'ShowAudioClipDto' as const,
      publicId: 'audio-1',
      fileName: 'intro.mp3',
      startMs: 0,
      durationMs: 180_000,
      beatsMs: [500, 1000, 1500],
      peaks: [0.1, 0.8, 0.4],
    },
  ],
  lightTracks: [
    {
      __typename: 'ShowLightTrackDto' as const,
      id: 'track-1',
      name: 'Front',
      clips: [
        {
          __typename: 'ShowLightClipDto' as const,
          id: 'clip-1',
          functionPublicId: 'fn-1',
          startMs: 500,
          durationMs: 4000,
          followBeat: true,
        },
      ],
    },
  ],
};

const showsQuery = (shows: unknown[]) => ({
  request: { query: GetShowsDocument, variables: { projectPublicId: 'proj-1' } },
  result: { data: { shows } },
});

const projectQuery = {
  request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
  result: mockGetProjectResult({ projectFunctions: [chase] }),
};

describe('ShowManagerView', () => {
  afterEach(() => {
    resetDmxStore();
    vi.clearAllMocks();
  });

  it('GIVEN no shows WHEN a new show is named THEN it is created', async () => {
    const added = vi.fn(() => ({ data: { addShow: { ...show, lightTracks: [], audioClips: [] } } }));
    const { user } = renderWithProviders(<ShowManagerView projectPublicId="proj-1" />, {
      apolloMocks: [
        showsQuery([]),
        projectQuery,
        {
          request: { query: AddShowDocument, variables: { input: { projectPublicId: 'proj-1', name: 'Opening' } } },
          result: added,
        },
        showsQuery([show]),
      ],
    });

    expect(await screen.findByText('This project has no shows yet.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'New show' }));
    await user.type(await screen.findByLabelText('Name'), 'Opening');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(added).toHaveBeenCalledTimes(1);
    });
  });

  it('GIVEN a show WHEN a clip stops following the beat and is saved THEN the whole show is sent', async () => {
    const saved = vi.fn(() => ({ data: { updateShow: show } }));
    const { user } = renderWithProviders(<ShowManagerView projectPublicId="proj-1" />, {
      apolloMocks: [
        showsQuery([show]),
        projectQuery,
        {
          request: {
            query: UpdateShowDocument,
            variables: {
              input: {
                publicId: SHOW_ID,
                name: 'Opening',
                lightTracks: [
                  {
                    id: 'track-1',
                    name: 'Front',
                    clips: [
                      { id: 'clip-1', functionPublicId: 'fn-1', startMs: 500, durationMs: 4000, followBeat: false },
                    ],
                  },
                ],
                audioClips: [{ publicId: 'audio-1', startMs: 0 }],
              },
            },
          },
          result: saved,
        },
        showsQuery([show]),
      ],
    });

    fireEvent.pointerDown(await screen.findByRole('button', { name: 'Chase' }));
    await user.click(await screen.findByRole('switch', { name: 'Follow beat' }));
    expect(screen.getByText('Unsaved changes play after saving')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(saved).toHaveBeenCalledTimes(1);
    });
  });

  it('GIVEN a show WHEN a track is added and a function placed on it THEN both appear in the draft', async () => {
    const { user } = renderWithProviders(<ShowManagerView projectPublicId="proj-1" />, {
      apolloMocks: [showsQuery([show]), projectQuery],
    });

    await user.click(await screen.findByRole('button', { name: 'Add light track' }));
    await user.click(screen.getByRole('button', { name: 'Add function' }));

    expect(screen.getByRole('button', { name: 'Track 2' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('button', { name: 'Chase' })).toHaveLength(2);
    expect(screen.getByRole('switch', { name: 'Follow beat' })).toBeChecked();
  });

  it('GIVEN a selected track WHEN removed THEN its clips leave the draft', async () => {
    const { user } = renderWithProviders(<ShowManagerView projectPublicId="proj-1" />, {
      apolloMocks: [showsQuery([show]), projectQuery],
    });

    await user.click(await screen.findByRole('button', { name: 'Front' }));
    await user.click(screen.getByRole('button', { name: 'Remove track' }));

    expect(screen.queryByRole('button', { name: 'Chase' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('GIVEN the show plays WHEN rendered THEN times show and pause and seeking drive the backend', async () => {
    dmxStore
      .getState()
      .setShowPlayback({ showPublicId: SHOW_ID, status: 'playing', positionMs: 61_000, durationMs: 180_000 });
    const { user } = renderWithProviders(<ShowManagerView projectPublicId="proj-1" />, {
      apolloMocks: [showsQuery([show]), projectQuery],
    });

    expect(await screen.findByLabelText('Elapsed')).toHaveTextContent('1:01 / 3:00');
    expect(screen.getByLabelText('Remaining')).toHaveTextContent('-1:59');
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    fireEvent.pointerDown(screen.getByLabelText('Timeline'), { clientX: 400 });
    fireEvent.pointerUp(window);

    expect(socket.pauseShow).toHaveBeenCalledTimes(1);
    // 400 px at the default 40 px per second.
    expect(socket.playShow).toHaveBeenCalledWith(SHOW_ID, 10_000);
  });

  it('GIVEN a paused show WHEN the timeline is clicked THEN it stays paused and Play starts from there', async () => {
    dmxStore
      .getState()
      .setShowPlayback({ showPublicId: SHOW_ID, status: 'paused', positionMs: 61_000, durationMs: 180_000 });
    const { user } = renderWithProviders(<ShowManagerView projectPublicId="proj-1" />, {
      apolloMocks: [showsQuery([show]), projectQuery],
    });

    fireEvent.pointerDown(await screen.findByLabelText('Timeline'), { clientX: 400 });
    fireEvent.pointerUp(window);
    expect(socket.playShow).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Play' }));

    expect(socket.playShow).toHaveBeenCalledWith(SHOW_ID, 10_000);
  });

  it('GIVEN a paused show without a seek WHEN Play is pressed THEN it resumes', async () => {
    dmxStore
      .getState()
      .setShowPlayback({ showPublicId: SHOW_ID, status: 'paused', positionMs: 61_000, durationMs: 180_000 });
    const { user } = renderWithProviders(<ShowManagerView projectPublicId="proj-1" />, {
      apolloMocks: [showsQuery([show]), projectQuery],
    });

    await user.click(await screen.findByRole('button', { name: 'Play' }));

    expect(socket.playShow).toHaveBeenCalledWith(SHOW_ID, undefined);
  });

  it('GIVEN unsaved edits WHEN looking at the show picker THEN switching is locked until save or cancel', async () => {
    const { user } = renderWithProviders(<ShowManagerView projectPublicId="proj-1" />, {
      apolloMocks: [showsQuery([show]), projectQuery],
    });

    await user.click(await screen.findByRole('button', { name: 'Add light track' }));

    expect(screen.getByRole('combobox', { name: 'Show' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('combobox', { name: 'Show' })).toBeEnabled();
  });

  it('GIVEN audio with beats WHEN rendered THEN each beat draws a grid line', async () => {
    renderWithProviders(<ShowManagerView projectPublicId="proj-1" />, {
      apolloMocks: [showsQuery([show]), projectQuery],
    });

    expect(await screen.findByRole('button', { name: 'intro.mp3' })).toBeInTheDocument();
    expect(screen.getAllByTestId('show-beat')).toHaveLength(3);
  });
});
