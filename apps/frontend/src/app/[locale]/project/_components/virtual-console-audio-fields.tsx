'use client';

import { useTranslation } from '@/lib/i18n/use-translation';
import { NumberInput, Select } from '@mantine/core';
import { useIntl } from 'react-intl';
import {
  audioBandRangeHz,
  beatBarOf,
  patchAudioBar,
  resizeAudioBars,
  VIRTUAL_CONSOLE_AUDIO_BANDS_MAX,
  VIRTUAL_CONSOLE_AUDIO_BANDS_MIN,
  VIRTUAL_CONSOLE_BEAT_DEFAULT_TIMING,
  type VirtualConsoleAudioBarMode,
  type VirtualConsoleBeatBar,
  type VirtualConsoleControl,
} from './virtual-console-document';

type VirtualConsoleAudioFieldsProperties = {
  control: VirtualConsoleControl;
  barIndex: number;
  onBarIndexChange: (index: number) => void;
  onPatch: (patch: Partial<VirtualConsoleControl>) => void;
};

type CommitNumberInputProperties = {
  label: string;
  value: number;
  min: number;
  max: number;
  onCommit: (value: number) => void;
};

/** Commits on blur or Enter: each keystroke of "12" would otherwise apply 1 first (dropping bars, clamping thresholds). */
const CommitNumberInput = ({ label, value, min, max, onCommit }: CommitNumberInputProperties) => (
  <NumberInput
    // Remounts on outside changes so the draft never shows a stale value.
    key={value}
    label={label}
    min={min}
    max={max}
    allowDecimal={false}
    clampBehavior="blur"
    defaultValue={value}
    onBlur={event => {
      const typed = Number(event.currentTarget.value);
      const next =
        Number.isFinite(typed) && event.currentTarget.value !== ''
          ? Math.min(max, Math.max(min, Math.round(typed)))
          : value;
      if (next !== value) onCommit(next);
    }}
    onKeyDown={event => {
      if (event.key === 'Enter') event.currentTarget.blur();
    }}
  />
);

type BeatTimingFieldsProperties = {
  beatBar: VirtualConsoleBeatBar;
  onChange: (beatBar: VirtualConsoleBeatBar) => void;
};

const TIMING_PARTS = ['fadeIn', 'hold', 'fadeOut'] as const;

/** Follow beat: each part is a percent of the time between beats, together at most 100. */
const BeatTimingFields = ({ beatBar, onChange }: BeatTimingFieldsProperties) => {
  const { t } = useTranslation();
  const { timing, ...withoutTiming } = beatBar;
  const partLabels: Record<(typeof TIMING_PARTS)[number], string> = {
    fadeIn: t({ id: 'ProjectDetail.virtualConsole.audio.timingFadeIn', defaultMessage: 'Fade in (%)' }),
    hold: t({ id: 'ProjectDetail.virtualConsole.audio.timingHold', defaultMessage: 'Hold (%)' }),
    fadeOut: t({ id: 'ProjectDetail.virtualConsole.audio.timingFadeOut', defaultMessage: 'Fade out (%)' }),
  };

  return (
    <>
      <Select
        allowDeselect={false}
        label={t({ id: 'ProjectDetail.virtualConsole.audio.timing', defaultMessage: 'Timing' })}
        data={[
          {
            value: 'beat',
            label: t({ id: 'ProjectDetail.virtualConsole.audio.timingBeat', defaultMessage: 'Follow beat' }),
          },
          {
            value: 'sequence',
            label: t({ id: 'ProjectDetail.virtualConsole.audio.timingSequence', defaultMessage: 'From sequence' }),
          },
        ]}
        value={timing ? 'beat' : 'sequence'}
        onChange={value => {
          if (value === 'sequence') onChange(withoutTiming);
          if (value === 'beat' && !timing) onChange({ ...beatBar, timing: { ...VIRTUAL_CONSOLE_BEAT_DEFAULT_TIMING } });
        }}
      />
      {timing
        ? TIMING_PARTS.map(part => (
            <CommitNumberInput
              key={part}
              label={partLabels[part]}
              min={0}
              max={100 - TIMING_PARTS.reduce((sum, other) => (other === part ? sum : sum + timing[other]), 0)}
              value={timing[part]}
              onCommit={value => {
                onChange({ ...beatBar, timing: { ...timing, [part]: value } });
              }}
            />
          ))
        : null}
    </>
  );
};

const BAR_MODES: readonly VirtualConsoleAudioBarMode[] = ['none', 'channels', 'function'];
const isBarMode = (value: string | null): value is VirtualConsoleAudioBarMode => BAR_MODES.some(mode => mode === value);

/** Band count plus the selected bar's mode and thresholds; its channels or function are picked in the channel panel. */
const VirtualConsoleAudioFields = ({
  control,
  barIndex,
  onBarIndexChange,
  onPatch,
}: VirtualConsoleAudioFieldsProperties) => {
  const { t } = useTranslation();
  const { formatNumber } = useIntl();
  const formatHz = (hz: number) =>
    hz < 1000 ? `${formatNumber(Math.round(hz))} Hz` : `${formatNumber(hz / 1000, { maximumFractionDigits: 1 })} kHz`;
  const bars = control.audioBars ?? [];
  const bandLabel = (band: number) => {
    const { low, high } = audioBandRangeHz(band, bars.length - 1);
    return t(
      { id: 'ProjectDetail.virtualConsole.audio.bandRange', defaultMessage: 'Band {number} ({low} – {high})' },
      { number: band, low: formatHz(low), high: formatHz(high) },
    );
  };
  const bar = bars[barIndex];
  // The beat bar is selected by the index right after the band bars.
  const beatSelected = barIndex === bars.length;
  const beatBar = beatBarOf(control);
  const patchBar = (patch: Parameters<typeof patchAudioBar>[2]) => {
    onPatch({ audioBars: patchAudioBar(bars, barIndex, patch) });
  };
  const modeLabels: Record<VirtualConsoleAudioBarMode, string> = {
    none: t({ id: 'ProjectDetail.virtualConsole.audio.modeNone', defaultMessage: 'Nothing' }),
    channels: t({ id: 'ProjectDetail.virtualConsole.bindChannels', defaultMessage: 'Channels' }),
    function: t({ id: 'ProjectDetail.virtualConsole.bindFunction', defaultMessage: 'Function' }),
  };

  return (
    <>
      <CommitNumberInput
        label={t({ id: 'ProjectDetail.virtualConsole.audio.bandCount', defaultMessage: 'Bands' })}
        min={VIRTUAL_CONSOLE_AUDIO_BANDS_MIN}
        max={VIRTUAL_CONSOLE_AUDIO_BANDS_MAX}
        value={control.bandCount ?? VIRTUAL_CONSOLE_AUDIO_BANDS_MIN}
        onCommit={bandCount => {
          onPatch({ bandCount, audioBars: resizeAudioBars(bars, bandCount) });
          if (beatSelected) onBarIndexChange(bandCount + 1);
          else if (barIndex > bandCount) onBarIndexChange(bandCount);
        }}
      />
      <Select
        allowDeselect={false}
        label={t({ id: 'ProjectDetail.virtualConsole.audio.bar', defaultMessage: 'Bar' })}
        data={[
          ...bars.map((_, index) => ({
            value: String(index),
            label:
              index === 0
                ? t({ id: 'ProjectDetail.virtualConsole.audio.volume', defaultMessage: 'Volume' })
                : bandLabel(index),
          })),
          {
            value: String(bars.length),
            label: t({ id: 'ProjectDetail.virtualConsole.audio.beat', defaultMessage: 'Beat' }),
          },
        ]}
        value={String(barIndex)}
        onChange={value => {
          if (value !== null) onBarIndexChange(Number(value));
        }}
      />
      {beatSelected ? (
        <>
          <CommitNumberInput
            label={t({ id: 'ProjectDetail.virtualConsole.audio.minThreshold', defaultMessage: 'Min threshold (%)' })}
            min={0}
            max={100}
            value={beatBar.minThreshold}
            onCommit={minThreshold => {
              onPatch({ beatBar: { ...beatBar, minThreshold } });
            }}
          />
          <BeatTimingFields
            beatBar={beatBar}
            onChange={next => {
              onPatch({ beatBar: next });
            }}
          />
        </>
      ) : null}
      {bar ? (
        <>
          <Select
            allowDeselect={false}
            label={t({ id: 'ProjectDetail.virtualConsole.audio.mode', defaultMessage: 'Drives' })}
            data={BAR_MODES.map(mode => ({ value: mode, label: modeLabels[mode] }))}
            value={bar.mode}
            onChange={value => {
              if (isBarMode(value)) patchBar({ mode: value });
            }}
          />
          <CommitNumberInput
            label={t({ id: 'ProjectDetail.virtualConsole.audio.minThreshold', defaultMessage: 'Min threshold (%)' })}
            min={0}
            max={bar.maxThreshold - 1}
            value={bar.minThreshold}
            onCommit={minThreshold => {
              patchBar({ minThreshold });
            }}
          />
          <CommitNumberInput
            label={t({ id: 'ProjectDetail.virtualConsole.audio.maxThreshold', defaultMessage: 'Max threshold (%)' })}
            min={bar.minThreshold + 1}
            max={100}
            value={bar.maxThreshold}
            onCommit={maxThreshold => {
              patchBar({ maxThreshold });
            }}
          />
        </>
      ) : null}
    </>
  );
};

export default VirtualConsoleAudioFields;
