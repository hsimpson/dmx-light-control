'use client';

import { getDmxWebsocketClient } from '@/lib/dmx/dmx-socket-connector';
import { useDmxStore } from '@/lib/dmx/dmx-store';
import { useTranslation } from '@/lib/i18n/use-translation';
import { ActionIcon, Button, Group, Progress, Slider, Stack, Text } from '@mantine/core';
import { PauseIcon, PlayIcon, StopIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { cueAt, formatShowTime, type ShowCue } from './show-document';
import classes from './show-transport.module.css';

type ShowTransportProperties = {
  showPublicId: string;
  /** Length shown while this show is not loaded in the backend. */
  durationMs: number;
  /** Where Play starts; without it a paused show resumes and a stopped one starts at the beginning. */
  startMs?: number;
  /** The console fills its control and grows with it, seeks on its bar and lists the cues as buttons. */
  layout?: 'editor' | 'console';
  /** Jump targets in the console layout; clicking one plays the show from there. */
  cues?: readonly ShowCue[];
};

const NO_CUES: readonly ShowCue[] = [];
/** Console sizes follow the control's height (container query units); the editor keeps fixed sizes. */
const CONSOLE_BUTTON_SIZE = 'clamp(28px, 22cqh, 64px)';
const CONSOLE_ICON_SIZE = '55%';
const CONSOLE_FONT_SIZE = 'clamp(0.8rem, 9cqh, 1.6rem)';
const SEEK_STEP_MS = 1000;

/** Play, pause and stop for one show, with elapsed, total and remaining time from the backend's playback. */
const ShowTransport = ({
  showPublicId,
  durationMs,
  startMs,
  layout = 'editor',
  cues = NO_CUES,
}: ShowTransportProperties) => {
  const { t } = useTranslation();
  const playback = useDmxStore(state => state.showPlayback);
  const loaded = playback.showPublicId === showPublicId;
  const status = loaded ? playback.status : 'stopped';
  const positionMs = loaded ? playback.positionMs : 0;
  const totalMs = loaded ? playback.durationMs : durationMs;
  const isConsole = layout === 'console';
  const size = isConsole ? CONSOLE_BUTTON_SIZE : 'lg';
  const iconSize = isConsole ? CONSOLE_ICON_SIZE : undefined;
  const fontSize = isConsole ? CONSOLE_FONT_SIZE : 'sm';
  // The thumb while it is dragged; the jump waits for release, so a playing show jumps once.
  const [dragMs, setDragMs] = useState<number | null>(null);
  const { current, next } = loaded ? cueAt(cues, positionMs) : {};

  const play = () => {
    getDmxWebsocketClient()?.playShow(showPublicId, startMs);
  };
  const playFrom = (ms: number) => {
    getDmxWebsocketClient()?.playShow(showPublicId, ms);
  };

  return (
    <Stack gap={4} className={isConsole ? classes.console : undefined}>
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
            <PauseIcon weight="fill" size={iconSize} />
          </ActionIcon>
        ) : (
          <ActionIcon
            size={size}
            variant="filled"
            color="green"
            aria-label={t({ id: 'ShowManager.play', defaultMessage: 'Play' })}
            onClick={play}
          >
            <PlayIcon weight="fill" size={iconSize} />
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
          <StopIcon weight="fill" size={iconSize} />
        </ActionIcon>
        <Text
          fz={fontSize}
          ff="monospace"
          className={classes.time}
          aria-label={t({ id: 'ShowManager.elapsed', defaultMessage: 'Elapsed' })}
        >
          {formatShowTime(positionMs)} / {formatShowTime(totalMs)}
        </Text>
        <Text
          fz={fontSize}
          ff="monospace"
          c="dimmed"
          className={classes.time}
          aria-label={t({ id: 'ShowManager.remaining', defaultMessage: 'Remaining' })}
        >
          -{formatShowTime(Math.max(0, totalMs - positionMs))}
        </Text>
        {next && status !== 'stopped' ? (
          <Text fz={fontSize} c="dimmed" miw={0} truncate>
            {t(
              { id: 'ShowManager.nextCue', defaultMessage: 'Next: {name} in {time}' },
              { name: next.name, time: formatShowTime(next.ms - positionMs) },
            )}
          </Text>
        ) : null}
      </Group>
      {isConsole ? (
        <Slider
          thumbLabel={t({ id: 'ShowManager.position', defaultMessage: 'Position' })}
          min={0}
          max={Math.max(totalMs, SEEK_STEP_MS)}
          step={SEEK_STEP_MS}
          value={dragMs ?? Math.min(positionMs, totalMs)}
          disabled={totalMs <= 0}
          label={formatShowTime}
          marks={cues.map(cue => ({ value: cue.ms }))}
          size="clamp(6px, 8cqh, 20px)"
          thumbSize="clamp(14px, 14cqh, 32px)"
          classNames={{ mark: classes.cueMark }}
          onChange={setDragMs}
          onChangeEnd={ms => {
            setDragMs(null);
            playFrom(ms);
          }}
        />
      ) : (
        <Progress size="sm" value={totalMs > 0 ? (positionMs / totalMs) * 100 : 0} transitionDuration={0} />
      )}
      {isConsole && cues.length > 0 ? (
        <Group gap={4} className={classes.cues}>
          {cues.map(cue => (
            <Button
              key={cue.id}
              size="compact-sm"
              color="yellow"
              autoContrast
              variant={cue.id === current?.id ? 'filled' : 'default'}
              data-current={cue.id === current?.id}
              aria-label={t({ id: 'ShowManager.jumpToCue', defaultMessage: 'Jump to {name}' }, { name: cue.name })}
              data-testid="show-transport-cue"
              onClick={() => {
                playFrom(cue.ms);
              }}
            >
              {cue.name}
            </Button>
          ))}
        </Group>
      ) : null}
    </Stack>
  );
};

export default ShowTransport;
