'use client';

import { FixturePresetIcon } from '@/lib/fixtures/fixture-preset-icon';
import { FixtureChannelPreset } from '@/shared/types/graphql/graphql';
import { Tooltip } from '@mantine/core';
import classes from './dmx-channel-cell.module.css';

type DmxChannelCellProperties = {
  absoluteChannelNumber: number;
  preset: FixtureChannelPreset;
  tooltipLabel: string;
  dmxValue?: number;
};

const DmxChannelCell = ({ absoluteChannelNumber, preset, tooltipLabel, dmxValue = 0 }: DmxChannelCellProperties) => (
  <Tooltip label={tooltipLabel} withArrow openDelay={200}>
    <div
      className={classes.cell}
      data-testid={`dmx-channel-${absoluteChannelNumber}`}
      aria-label={tooltipLabel}
      role="img"
    >
      <FixturePresetIcon preset={preset} className={classes.presetIcon} />
      <span className={classes.value} aria-hidden="true">
        {dmxValue}
      </span>
    </div>
  </Tooltip>
);

export default DmxChannelCell;
