'use client';

import { useTranslation } from '@/lib/i18n/use-translation';
import { NumberInput, Select } from '@mantine/core';
import {
  patchAudioBar,
  resizeAudioBars,
  VIRTUAL_CONSOLE_AUDIO_BANDS_MAX,
  VIRTUAL_CONSOLE_AUDIO_BANDS_MIN,
  type VirtualConsoleAudioBarMode,
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
  const bars = control.audioBars ?? [];
  const bar = bars[barIndex];
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
          if (barIndex > bandCount) onBarIndexChange(bandCount);
        }}
      />
      <Select
        allowDeselect={false}
        label={t({ id: 'ProjectDetail.virtualConsole.audio.bar', defaultMessage: 'Bar' })}
        data={bars.map((_, index) => ({
          value: String(index),
          label:
            index === 0
              ? t({ id: 'ProjectDetail.virtualConsole.audio.volume', defaultMessage: 'Volume' })
              : t(
                  { id: 'ProjectDetail.virtualConsole.audio.band', defaultMessage: 'Band {number}' },
                  { number: index },
                ),
        }))}
        value={String(barIndex)}
        onChange={value => {
          if (value !== null) onBarIndexChange(Number(value));
        }}
      />
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
