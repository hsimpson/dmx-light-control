'use client';

import { getDmxWebsocketClient } from '@/lib/dmx/dmx-socket-connector';
import { useDmxStore } from '@/lib/dmx/dmx-store';
import { useTranslation } from '@/lib/i18n/use-translation';
import { ActionIcon, Group, Progress, Stack, Text } from '@mantine/core';
import { PauseIcon, PlayIcon, StopIcon } from '@phosphor-icons/react';
import { formatShowTime } from './show-document';

type ShowTransportProperties = {
  showPublicId: string;
  /** Length shown while this show is not loaded in the backend. */
  durationMs: number;
  /** Where Play starts; without it a paused show resumes and a stopped one starts at the beginning. */
  startMs?: number;
  compact?: boolean;
};

/** Play, pause and stop for one show, with elapsed, total and remaining time from the backend's playback. */
const ShowTransport = ({ showPublicId, durationMs, startMs, compact = false }: ShowTransportProperties) => {
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
      <Progress size="sm" value={totalMs > 0 ? (positionMs / totalMs) * 100 : 0} transitionDuration={0} />
    </Stack>
  );
};

export default ShowTransport;
