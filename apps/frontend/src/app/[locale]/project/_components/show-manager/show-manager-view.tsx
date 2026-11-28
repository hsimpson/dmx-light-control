'use client';

import { Loading } from '@/components/loading';
import { graphqlApiOrigin } from '@/lib/graphql/graphql-api-origin';
import { getDmxWebsocketClient } from '@/lib/dmx/dmx-socket-connector';
import { useDmxStore } from '@/lib/dmx/dmx-store';
import { globalMessages } from '@/lib/i18n/global-messages';
import { useTranslation } from '@/lib/i18n/use-translation';
import {
  AddShowDocument,
  DeleteShowDocument,
  GetProjectDocument,
  GetShowsDocument,
  UpdateShowDocument,
} from '@/shared/types/graphql/graphql';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  ActionIcon,
  Button,
  FileButton,
  Group,
  Modal,
  Paper,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  FlagIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  MusicNotesPlusIcon,
  PencilSimpleIcon,
  PlusCircleIcon,
  RowsPlusBottomIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import { useState } from 'react';
import {
  addCue,
  addLightClip,
  addLightTrack,
  createLightClip,
  findLightClip,
  removeCue,
  removeLightClip,
  removeLightTrack,
  showBeatsMs,
  showDurationMs,
  snapToBeat,
  toUpdateShowInput,
  updateCue,
  updateLightClip,
  type ShowDocument,
} from './show-document';
import ShowTimeline, { type ShowSelection } from './show-timeline';
import ShowTransport from './show-transport';

const DEFAULT_PIXELS_PER_SECOND = 40;
const MIN_PIXELS_PER_SECOND = 5;
const MAX_PIXELS_PER_SECOND = 320;
/** Same snap distance on screen as the timeline's clip edges. */
const CUE_SNAP_PX = 8;
const AUDIO_ACCEPT = '.mp3,.wav,.flac,.ogg,.opus,audio/*';

type ShowManagerViewProperties = { projectPublicId: string };

type NameDialog = { mode: 'add' | 'rename'; name: string } | null;

const sameShow = (a: ShowDocument, b: ShowDocument) =>
  JSON.stringify(toUpdateShowInput(a)) === JSON.stringify(toUpdateShowInput(b));

const ShowManagerView = ({ projectPublicId }: ShowManagerViewProperties) => {
  const { t } = useTranslation();
  const showsQuery = { query: GetShowsDocument, variables: { projectPublicId } };
  const { data, loading, refetch } = useQuery(GetShowsDocument, { variables: { projectPublicId } });
  const { data: projectData } = useQuery(GetProjectDocument, { variables: { publicId: projectPublicId } });
  const [addShow] = useMutation(AddShowDocument, { refetchQueries: [showsQuery] });
  const [updateShow, { loading: saving }] = useMutation(UpdateShowDocument, { refetchQueries: [showsQuery] });
  // The project query too: deleting a show unsets the console controls that played it.
  const [deleteShow] = useMutation(DeleteShowDocument, {
    refetchQueries: [showsQuery, { query: GetProjectDocument, variables: { publicId: projectPublicId } }],
  });
  const playback = useDmxStore(state => state.showPlayback);
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
  const [edits, setEdits] = useState<ShowDocument | null>(null);
  const [selection, setSelection] = useState<ShowSelection>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [cursorMs, setCursorMs] = useState(0);
  const [pixelsPerSecond, setPixelsPerSecond] = useState(DEFAULT_PIXELS_PER_SECOND);
  const [nameDialog, setNameDialog] = useState<NameDialog>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  // A seek while paused moves the cursor and Play starts there; valid only while still paused at that position.
  const [pausedSeekAt, setPausedSeekAt] = useState<number | null>(null);

  if (loading && !data) {
    return <Loading />;
  }

  const shows = data?.shows ?? [];
  const saved = shows.find(show => show.publicId === selectedShowId) ?? shows[0];
  const draft = edits ?? saved;
  const dirty = edits !== null && saved !== undefined && !sameShow(edits, saved);
  const functions = projectData?.project?.projectFunctions ?? [];
  const functionNames = new Map(functions.map(fn => [fn.publicId, fn.name]));
  const functionOptions = functions.map(fn => ({ value: fn.publicId, label: fn.name }));

  const fail = (error: unknown) => {
    notifications.show({
      color: 'red',
      title: t(globalMessages.error),
      message: error instanceof Error ? error.message : String(error),
    });
  };

  const selectShow = (publicId: string | null) => {
    setSelectedShowId(publicId);
    setEdits(null);
    setSelection(null);
    setSelectedTrackId(null);
    setCursorMs(0);
  };

  const edit = (next: ShowDocument) => {
    setEdits(next);
  };

  const submitName = async () => {
    const name = nameDialog?.name.trim();
    if (!nameDialog || !name) return;
    try {
      if (nameDialog.mode === 'add') {
        const result = await addShow({ variables: { input: { projectPublicId, name } } });
        selectShow(result.data?.addShow.publicId ?? null);
      } else if (draft) {
        await updateShow({ variables: { input: { publicId: draft.publicId, name } } });
        // Keeps unsaved edits from writing the old name back on Save.
        setEdits(current => current && { ...current, name });
      }
      setNameDialog(null);
    } catch (error) {
      fail(error);
    }
  };

  const save = async () => {
    if (!draft) return;
    try {
      await updateShow({ variables: { input: toUpdateShowInput(draft) } });
      setEdits(null);
    } catch (error) {
      fail(error);
    }
  };

  const removeShow = async () => {
    if (!draft) return;
    try {
      await deleteShow({ variables: { publicId: draft.publicId } });
      setConfirmDelete(false);
      selectShow(null);
    } catch (error) {
      fail(error);
    }
  };

  const audioRequest = async (method: 'POST' | 'DELETE', path: string, body?: FormData) => {
    setBusy(true);
    try {
      const response = await fetch(`${graphqlApiOrigin()}/shows/${path}`, { method, body });
      if (!response.ok) {
        throw new Error(t({ id: 'ShowManager.audioFailed', defaultMessage: 'The audio file could not be processed.' }));
      }
      await refetch();
      // Upload and delete are only offered without unsaved changes; the draft must show the new audio.
      setEdits(null);
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };

  const uploadAudio = async (file: File | null) => {
    if (!file || !draft) return;
    const body = new FormData();
    body.append('file', file);
    await audioRequest('POST', `${draft.publicId}/audio`, body);
  };

  if (!draft) {
    return (
      <Stack align="center" mt="xl">
        <Text c="dimmed">{t({ id: 'ShowManager.empty', defaultMessage: 'This project has no shows yet.' })}</Text>
        <Button
          leftSection={<PlusCircleIcon />}
          onClick={() => {
            setNameDialog({ mode: 'add', name: '' });
          }}
        >
          {t({ id: 'ShowManager.add', defaultMessage: 'New show' })}
        </Button>
        <NameModal dialog={nameDialog} onChange={setNameDialog} onSubmit={submitName} />
      </Stack>
    );
  }

  const thisStatus = playback.showPublicId === draft.publicId ? playback.status : 'stopped';
  const seekedWhilePaused = thisStatus === 'paused' && pausedSeekAt === playback.positionMs;
  const followsPlayback = thisStatus === 'playing' || (thisStatus === 'paused' && !seekedWhilePaused);
  const playheadMs = followsPlayback ? playback.positionMs : cursorMs;
  const transportStartMs = thisStatus === 'paused' && !seekedWhilePaused ? undefined : cursorMs;
  const selectedClip = selection?.kind === 'light' ? findLightClip(draft, selection.id) : undefined;
  const selectedCue = selection?.kind === 'cue' ? draft.cues.find(cue => cue.id === selection.id) : undefined;
  const selectedTrack = draft.lightTracks.find(track => track.id === selectedTrackId);
  const firstFunction = functions[0];

  const seek = (ms: number) => {
    setCursorMs(ms);
    if (thisStatus === 'playing') getDmxWebsocketClient()?.playShow(draft.publicId, ms);
    if (thisStatus === 'paused') setPausedSeekAt(playback.positionMs);
  };

  const addClip = () => {
    if (!selectedTrack || !firstFunction) return;
    const clip = createLightClip(firstFunction.publicId, playheadMs);
    edit(addLightClip(draft, selectedTrack.id, clip));
    setSelection({ kind: 'light', id: clip.id });
  };

  const zoom = (factor: number) => {
    setPixelsPerSecond(pps => Math.min(MAX_PIXELS_PER_SECOND, Math.max(MIN_PIXELS_PER_SECOND, pps * factor)));
  };

  const addCueAtPlayhead = () => {
    const ms = snapToBeat(playheadMs, showBeatsMs(draft), (CUE_SNAP_PX / pixelsPerSecond) * 1000);
    const name = t(
      { id: 'ShowManager.cueDefaultName', defaultMessage: 'Cue {number}' },
      { number: draft.cues.length + 1 },
    );
    const next = addCue(draft, ms, name);
    edit(next);
    setSelection({ kind: 'cue', id: next.cues.at(-1)?.id ?? '' });
  };

  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Group gap="xs">
          <Select
            aria-label={t({ id: 'ShowManager.show', defaultMessage: 'Show' })}
            data={shows.map(show => ({ value: show.publicId, label: show.name }))}
            value={draft.publicId}
            allowDeselect={false}
            // Switching would drop unsaved edits; save or cancel first.
            disabled={dirty}
            onChange={selectShow}
          />
          <ActionIcon
            variant="subtle"
            disabled={dirty}
            aria-label={t({ id: 'ShowManager.add', defaultMessage: 'New show' })}
            onClick={() => {
              setNameDialog({ mode: 'add', name: '' });
            }}
          >
            <PlusCircleIcon />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            aria-label={t({ id: 'ShowManager.rename', defaultMessage: 'Rename show' })}
            onClick={() => {
              setNameDialog({ mode: 'rename', name: draft.name });
            }}
          >
            <PencilSimpleIcon />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="red"
            aria-label={t({ id: 'ShowManager.delete', defaultMessage: 'Delete show' })}
            onClick={() => {
              setConfirmDelete(true);
            }}
          >
            <TrashIcon />
          </ActionIcon>
        </Group>
        <ShowTransport showPublicId={draft.publicId} durationMs={showDurationMs(draft)} startMs={transportStartMs} />
      </Group>

      <Group justify="space-between">
        <Group gap="xs">
          <FileButton accept={AUDIO_ACCEPT} onChange={file => void uploadAudio(file)} disabled={dirty || busy}>
            {props => (
              <Button {...props} variant="default" leftSection={<MusicNotesPlusIcon />} loading={busy}>
                {t({ id: 'ShowManager.addAudio', defaultMessage: 'Add audio' })}
              </Button>
            )}
          </FileButton>
          <Button
            variant="default"
            leftSection={<RowsPlusBottomIcon />}
            onClick={() => {
              const next = addLightTrack(
                draft,
                t(
                  { id: 'ShowManager.trackName', defaultMessage: 'Track {number}' },
                  { number: draft.lightTracks.length + 1 },
                ),
              );
              edit(next);
              setSelectedTrackId(next.lightTracks.at(-1)?.id ?? null);
            }}
          >
            {t({ id: 'ShowManager.addTrack', defaultMessage: 'Add light track' })}
          </Button>
          <Button
            variant="default"
            leftSection={<PlusCircleIcon />}
            disabled={!selectedTrack || !firstFunction}
            onClick={addClip}
          >
            {t({ id: 'ShowManager.addClip', defaultMessage: 'Add function' })}
          </Button>
          <Button variant="default" leftSection={<FlagIcon />} onClick={addCueAtPlayhead}>
            {t({ id: 'ShowManager.addCue', defaultMessage: 'Add cue' })}
          </Button>
          <ActionIcon
            variant="subtle"
            aria-label={t({ id: 'ShowManager.zoomOut', defaultMessage: 'Zoom out' })}
            onClick={() => {
              zoom(0.5);
            }}
          >
            <MagnifyingGlassMinusIcon />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            aria-label={t({ id: 'ShowManager.zoomIn', defaultMessage: 'Zoom in' })}
            onClick={() => {
              zoom(2);
            }}
          >
            <MagnifyingGlassPlusIcon />
          </ActionIcon>
        </Group>
        <Group gap="xs">
          {dirty ? (
            <Text size="sm" c="orange">
              {t({ id: 'ShowManager.unsaved', defaultMessage: 'Unsaved changes play after saving' })}
            </Text>
          ) : null}
          <Button
            variant="default"
            disabled={!dirty}
            onClick={() => {
              setEdits(null);
              setSelection(null);
            }}
          >
            {t(globalMessages.cancel)}
          </Button>
          <Button disabled={!dirty} loading={saving} onClick={() => void save()}>
            {t(globalMessages.save)}
          </Button>
        </Group>
      </Group>

      <ShowTimeline
        show={draft}
        functionNames={functionNames}
        pixelsPerSecond={pixelsPerSecond}
        playheadMs={playheadMs}
        selection={selection}
        selectedTrackId={selectedTrackId}
        onSelect={setSelection}
        onSelectTrack={setSelectedTrackId}
        onChange={edit}
        onSeek={seek}
        onZoom={zoom}
      />

      {selectedClip ? (
        <Paper withBorder p="sm">
          <Group align="flex-end">
            <Select
              label={t({ id: 'ShowManager.function', defaultMessage: 'Function' })}
              data={functionOptions}
              value={selectedClip.functionPublicId}
              allowDeselect={false}
              onChange={value => {
                if (value) edit(updateLightClip(draft, selectedClip.id, { functionPublicId: value }));
              }}
            />
            <Switch
              label={t({ id: 'ShowManager.followBeat', defaultMessage: 'Follow beat' })}
              checked={selectedClip.followBeat}
              onChange={event => {
                edit(updateLightClip(draft, selectedClip.id, { followBeat: event.currentTarget.checked }));
              }}
            />
            <Button
              color="red"
              variant="light"
              leftSection={<TrashIcon />}
              onClick={() => {
                edit(removeLightClip(draft, selectedClip.id));
                setSelection(null);
              }}
            >
              {t({ id: 'ShowManager.removeClip', defaultMessage: 'Remove clip' })}
            </Button>
          </Group>
        </Paper>
      ) : null}

      {selection?.kind === 'audio' ? (
        <Paper withBorder p="sm">
          <Group>
            <Text size="sm">{draft.audioClips.find(clip => clip.publicId === selection.id)?.fileName}</Text>
            <Button
              color="red"
              variant="light"
              leftSection={<TrashIcon />}
              disabled={dirty || busy}
              onClick={() => {
                void audioRequest('DELETE', `${draft.publicId}/audio/${selection.id}`);
                setSelection(null);
              }}
            >
              {t({ id: 'ShowManager.removeAudio', defaultMessage: 'Remove audio' })}
            </Button>
          </Group>
        </Paper>
      ) : null}

      {selectedCue ? (
        <Paper withBorder p="sm">
          <Group align="flex-end">
            <TextInput
              key={selectedCue.id}
              label={t({ id: 'ShowManager.cueName', defaultMessage: 'Cue name' })}
              maxLength={64}
              defaultValue={selectedCue.name}
              onBlur={event => {
                const name = event.currentTarget.value;
                if (name !== selectedCue.name) edit(updateCue(draft, selectedCue.id, { name }));
              }}
            />
            <Button
              color="red"
              variant="light"
              leftSection={<TrashIcon />}
              onClick={() => {
                edit(removeCue(draft, selectedCue.id));
                setSelection(null);
              }}
            >
              {t({ id: 'ShowManager.removeCue', defaultMessage: 'Remove cue' })}
            </Button>
          </Group>
        </Paper>
      ) : null}

      {selectedTrack && !selectedClip && selection?.kind !== 'audio' && selection?.kind !== 'cue' ? (
        <Paper withBorder p="sm">
          <Group align="flex-end">
            <TextInput
              key={selectedTrack.id}
              label={t({ id: 'ShowManager.trackLabel', defaultMessage: 'Track name' })}
              defaultValue={selectedTrack.name}
              onBlur={event => {
                const name = event.currentTarget.value;
                if (name === selectedTrack.name) return;
                edit({
                  ...draft,
                  lightTracks: draft.lightTracks.map(track =>
                    track.id === selectedTrack.id ? { ...track, name } : track,
                  ),
                });
              }}
            />
            <Button
              color="red"
              variant="light"
              leftSection={<TrashIcon />}
              onClick={() => {
                edit(removeLightTrack(draft, selectedTrack.id));
                setSelectedTrackId(null);
                setSelection(null);
              }}
            >
              {t({ id: 'ShowManager.removeTrack', defaultMessage: 'Remove track' })}
            </Button>
          </Group>
        </Paper>
      ) : null}

      <NameModal dialog={nameDialog} onChange={setNameDialog} onSubmit={submitName} />
      <Modal
        opened={confirmDelete}
        title={t({ id: 'ShowManager.delete', defaultMessage: 'Delete show' })}
        onClose={() => {
          setConfirmDelete(false);
        }}
      >
        <Stack>
          <Text>
            {t(
              { id: 'ShowManager.deleteConfirm', defaultMessage: 'Delete {name} and its audio?' },
              { name: draft.name },
            )}
          </Text>
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                setConfirmDelete(false);
              }}
            >
              {t(globalMessages.cancel)}
            </Button>
            <Button color="red" onClick={() => void removeShow()}>
              {t({ id: 'ShowManager.delete', defaultMessage: 'Delete show' })}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

type NameModalProperties = {
  dialog: NameDialog;
  onChange: (dialog: NameDialog) => void;
  onSubmit: () => Promise<void>;
};

const NameModal = ({ dialog, onChange, onSubmit }: NameModalProperties) => {
  const { t } = useTranslation();
  return (
    <Modal
      opened={dialog !== null}
      title={
        dialog?.mode === 'rename'
          ? t({ id: 'ShowManager.rename', defaultMessage: 'Rename show' })
          : t({ id: 'ShowManager.add', defaultMessage: 'New show' })
      }
      onClose={() => {
        onChange(null);
      }}
    >
      <form
        onSubmit={event => {
          event.preventDefault();
          void onSubmit();
        }}
      >
        <Stack>
          <TextInput
            data-autofocus
            label={t({ id: 'ShowManager.name', defaultMessage: 'Name' })}
            maxLength={255}
            value={dialog?.name ?? ''}
            onChange={event => {
              if (dialog) onChange({ ...dialog, name: event.currentTarget.value });
            }}
          />
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                onChange(null);
              }}
            >
              {t(globalMessages.cancel)}
            </Button>
            <Button type="submit" disabled={!dialog?.name.trim()}>
              {t(globalMessages.save)}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};

export default ShowManagerView;
