'use client';

import { FixturePresetIcon } from '@/lib/fixtures/fixture-preset-icon';
import { FixtureChannelPreset } from '@/shared/types/graphql/graphql';
import { Tooltip } from '@mantine/core';
import type { CSSProperties } from 'react';
import classes from './universe-channel-square.module.css';

export const DMX_CHANNELS_PER_ROW = 24;
export const DMX_UNIVERSE_SIZE = 512;

type FixtureLabel = {
  name: string;
  fixtureNumber: number;
  columnSpan: number;
};

type UniverseChannelSquareProperties = {
  channelNumber: number;
  occupied?: boolean;
  preset?: FixtureChannelPreset;
  fixtureVariant?: 0 | 1;
  fixtureLabel?: FixtureLabel;
  tooltipLabel?: string;
};

const UniverseChannelSquare = ({
  channelNumber,
  occupied = false,
  preset,
  fixtureVariant,
  fixtureLabel,
  tooltipLabel,
}: UniverseChannelSquareProperties) => (
  <Tooltip label={tooltipLabel ?? String(channelNumber)} withArrow openDelay={200}>
    <div
      className={classes.square}
      data-occupied={occupied}
      data-fixture-variant={occupied ? fixtureVariant : undefined}
      data-testid={`universe-channel-${channelNumber}`}
      aria-label={tooltipLabel ?? `Channel ${channelNumber}`}
      role="img"
    >
      {fixtureLabel ? (
        <div
          className={classes.fixtureLabel}
          data-fixture-variant={fixtureVariant}
          data-testid={`universe-fixture-label-${fixtureLabel.fixtureNumber}`}
          style={{ '--column-span': fixtureLabel.columnSpan } as CSSProperties}
          aria-hidden="true"
        >
          {fixtureLabel.name} [{fixtureLabel.fixtureNumber}]
        </div>
      ) : null}
      {occupied && preset ? <FixturePresetIcon preset={preset} className={classes.presetIcon} /> : null}
      <span className={classes.channelNumber} aria-hidden="true">
        {channelNumber}
      </span>
    </div>
  </Tooltip>
);

export default UniverseChannelSquare;
