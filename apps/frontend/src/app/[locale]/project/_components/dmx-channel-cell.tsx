'use client';

import { FixturePresetIcon } from '@/lib/fixtures/fixture-preset-icon';
import { useDmxStore } from '@/lib/dmx/dmx-store';
import { FixtureChannelPreset } from '@/shared/types/graphql/graphql';
import { Tooltip } from '@mantine/core';
import classes from './dmx-channel-cell.module.css';

type DmxChannelCellProperties = {
  absoluteChannelNumber: number;
  preset: FixtureChannelPreset;
  tooltipLabel: string;
  dmxValue?: number;
};

const DmxChannelCell = ({ absoluteChannelNumber, preset, tooltipLabel, dmxValue }: DmxChannelCellProperties) => {
  const liveValue = useDmxStore(state => state.channels[absoluteChannelNumber - 1] ?? 0);
  const displayValue = dmxValue ?? liveValue;

  return (
    <Tooltip label={tooltipLabel} withArrow openDelay={200}>
      <div
        className={classes.cell}
        data-testid={`dmx-channel-${absoluteChannelNumber}`}
        aria-label={tooltipLabel}
        role="img"
      >
        <FixturePresetIcon preset={preset} className={classes.presetIcon} />
        <span className={classes.value} aria-hidden="true">
          {displayValue}
        </span>
      </div>
    </Tooltip>
  );
};

export default DmxChannelCell;
