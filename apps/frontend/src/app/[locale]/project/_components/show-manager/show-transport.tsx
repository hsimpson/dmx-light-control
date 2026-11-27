'use client';

import { getDmxWebsocketClient } from '@/lib/dmx/dmx-socket-connector';
import { useDmxStore } from '@/lib/dmx/dmx-store';
import { useTranslation } from '@/lib/i18n/use-translation';
import { ActionIcon, Box, Group, Progress, Stack, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { PauseIcon, PlayIcon, StopIcon } from '@phosphor-icons/react';
import { formatShowTime, type ShowCue } from './show-document';

type ShowTransportProperties = {
  showPublicId: string;
  /** Length shown while this show is not loaded in the backend. */
  durationMs: number;
  /** Where Play starts; without it a paused show resumes and a stopped one starts at the beginning. */
  startMs?: number;
  compact?: boolean;
  /** Marks on the progress bar; clicking one plays the show from there. */
  cues?: readonly ShowCue[];
};

const NO_CUES: readonly ShowCue[] = [];

/** Play, pause and stop for one show, with elapsed, total and remaining time from the backend's playback. */
const ShowTransport = ({
  showPublicId,
  durationMs,
  startMs,
  compact = false,
  cues = NO_CUES,
}: ShowTransportProperties) => {
  const { t } = useTranslation();
  const playback = useDmxStore(state => state.showPlayback);
  const loaded = playback.showPublicId === showPublicId;
  const status = loaded ? playback.status : 'stopped';
  const positionMs = loaded ? playback.positionMs : 0;
  const totalMs = loaded ? playback.durationMs : durationMs;
  const size = compact ? 'md' : 'lg';

  const play = () => {
    getDmxWebsocketClient()?.playShow(showPublicId, startMs);
  };

  return (
    <Stack gap={4}>
      <Group gap="xs" wrap="nowrap">
        {status === 'playing' ? (
          <ActionIcon
            size={size}
            variant="filled"
            aria-label={t({ id: 'ShowManager.pause', defaultMessage: 'Pause' })}
            onClick={() => {
              getDmxWebsocketClient()?.pauseShow();
            }}
          >
            <PauseIcon weight="fill" />
          </ActionIcon>
        ) : (
          <ActionIcon
            size={size}
            variant="filled"
            color="green"
            aria-label={t({ id: 'ShowManager.play', defaultMessage: 'Play' })}
            onClick={play}
          >
            <PlayIcon weight="fill" />
          </ActionIcon>
        )}
        <ActionIcon
          size={size}
          variant="default"
          disabled={status === 'stopped'}
          aria-label={t({ id: 'ShowManager.stop', defaultMessage: 'Stop' })}
          onClick={() => {
            getDmxWebsocketClient()?.stopShow();
          }}
        >
          <StopIcon weight="fill" />
        </ActionIcon>
        <Text size="sm" ff="monospace" aria-label={t({ id: 'ShowManager.elapsed', defaultMessage: 'Elapsed' })}>
          {formatShowTime(positionMs)} / {formatShowTime(totalMs)}
        </Text>
        <Text
          size="sm"
          ff="monospace"
          c="dimmed"
          aria-label={t({ id: 'ShowManager.remaining', defaultMessage: 'Remaining' })}
        >
          -{formatShowTime(Math.max(0, totalMs - positionMs))}
        </Text>
      </Group>
      <Box pos="relative">
        <Progress size="sm" value={totalMs > 0 ? (positionMs / totalMs) * 100 : 0} transitionDuration={0} />
        {totalMs > 0
          ? cues.map(cue => (
              <Tooltip key={cue.id} label={`${cue.name} ${formatShowTime(cue.ms)}`} withinPortal>
                <UnstyledButton
                  aria-label={t({ id: 'ShowManager.jumpToCue', defaultMessage: 'Jump to {name}' }, { name: cue.name })}
                  data-testid="show-transport-cue"
                  onClick={() => {
                    getDmxWebsocketClient()?.playShow(showPublicId, cue.ms);
                  }}
                  style={{
                    position: 'absolute',
                    top: -5,
                    left: `${Math.min(100, (cue.ms / totalMs) * 100)}%`,
                    // 12 px hit area around a 2 px mark, centred on the cue.
                    width: 12,
                    height: 18,
                    marginLeft: -6,
                    background:
                      'linear-gradient(to right, transparent 5px, var(--mantine-color-yellow-filled) 5px 7px, transparent 7px)',
                  }}
                />
              </Tooltip>
            ))
          : null}
      </Box>
    </Stack>
  );
};

export default ShowTransport;
