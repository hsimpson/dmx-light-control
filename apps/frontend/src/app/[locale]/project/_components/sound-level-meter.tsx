'use client';

import { useDmxStore } from '@/lib/dmx/dmx-store';
import { useTranslation } from '@/lib/i18n/use-translation';
import { Progress, Stack } from '@mantine/core';

// Peaks below -60 dBFS read as silence; a dB scale makes quiet signals visible.
const FLOOR_DB = -60;

export function toMeterPercent(level: number): number {
  if (level <= 0) return 0;
  const decibels = 20 * Math.log10(level);
  return Math.min(100, Math.max(0, ((decibels - FLOOR_DB) / -FLOOR_DB) * 100));
}

function meterColor(percent: number): string {
  if (percent >= 95) return 'red';
  return percent >= 80 ? 'yellow' : 'green';
}

type SoundLevelMeterProperties = {
  deviceName: string;
  channels: number;
};

const SoundLevelMeter = ({ deviceName, channels }: SoundLevelMeterProperties) => {
  const { t } = useTranslation();
  const levels = useDmxStore(state => state.soundLevels);
  // The backend may capture fewer channels than configured (mono-only device), so its levels win.
  const labels =
    (levels?.length ?? channels) >= 2
      ? [
          t({ id: 'ProjectDetail.io.level.left', defaultMessage: 'Left' }),
          t({ id: 'ProjectDetail.io.level.right', defaultMessage: 'Right' }),
        ]
      : [t({ id: 'ProjectDetail.io.level.mono', defaultMessage: 'Mono' })];

  return (
    <Stack gap={4} miw={140}>
      {labels.map((label, channel) => {
        const percent = toMeterPercent(levels?.[channel] ?? 0);
        return (
          <Progress
            key={label}
            value={percent}
            color={meterColor(percent)}
            transitionDuration={0}
            aria-label={t(
              { id: 'ProjectDetail.io.levelFor', defaultMessage: '{channel} input level of {name}' },
              { channel: label, name: deviceName },
            )}
          />
        );
      })}
    </Stack>
  );
};

export default SoundLevelMeter;
