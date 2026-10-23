'use client';

import { FixturePresetIcon } from '@/lib/fixtures/fixture-preset-icon';
import { useTranslation } from '@/lib/i18n/use-translation';
import { Text } from '@mantine/core';
import { VIRTUAL_CONSOLE_DEFAULT_FONT_FAMILY, VIRTUAL_CONSOLE_DEFAULT_FONT_WEIGHT } from './virtual-console-fonts';
import SliderControl from './virtual-console-controls/slider-control';
import type { VirtualConsoleControl } from './virtual-console-document';
import { sequenceChannelValue, type SequenceSliderChannel, type SequenceSliderGroup } from './sequence-slider-channels';
import classes from './sequence-slider-panel.module.css';
import type { SequenceStepDraft } from './sequence-steps';

const sliderControl = (channel: SequenceSliderChannel): VirtualConsoleControl => ({
  id: `sequence-channel-${channel.channel}`,
  type: 'slider',
  x: 0,
  y: 0,
  width: 48,
  height: 400,
  label: `${channel.name} · ${channel.channel}`,
  backgroundColor: '#25262b',
  foregroundColor: '#4dabf7',
  orientation: 'vertical',
  valueType: 'dmx',
  lowerLimit: 0,
  upperLimit: 255,
  fontFamily: VIRTUAL_CONSOLE_DEFAULT_FONT_FAMILY,
  fontSize: 12,
  fontWeight: VIRTUAL_CONSOLE_DEFAULT_FONT_WEIGHT,
});

export type SequenceSliderPanelProperties = {
  groups: readonly SequenceSliderGroup[];
  step: SequenceStepDraft | undefined;
  onChange: (channel: number, value: number) => void;
};

const SequenceSliderPanel = ({ groups, step, onChange }: SequenceSliderPanelProperties) => {
  const { t } = useTranslation();
  const label = t({ id: 'ProjectFunction.liveSliders', defaultMessage: 'Live channel sliders' });

  if (groups.length === 0) {
    return (
      <Text size="sm" c="dimmed" data-testid="sequence-slider-panel">
        {t({ id: 'ProjectFunction.liveSliders.empty', defaultMessage: 'No fixture channels selected.' })}
      </Text>
    );
  }

  return (
    <div className={classes.panel} role="group" aria-label={label} data-testid="sequence-slider-panel">
      {groups.map(group => (
        <section key={group.publicId} className={classes.group} aria-label={group.label}>
          <Text size="xs" fw={600} className={classes.fixtureLabel}>
            {group.label}
          </Text>
          <div className={classes.channels}>
            {group.channels.map(channel => {
              const value = sequenceChannelValue(step, channel.channel);
              return (
                <div key={channel.channel} className={classes.channel}>
                  <div className={classes.slider}>
                    <SliderControl
                      control={sliderControl(channel)}
                      mode="play"
                      value={value}
                      onPlayValue={next => {
                        onChange(channel.channel, next);
                      }}
                    />
                  </div>
                  {channel.preset ? (
                    <span
                      className={classes.icon}
                      data-testid={`sequence-slider-icon-${channel.channel}`}
                      data-preset={channel.preset}
                    >
                      <FixturePresetIcon preset={channel.preset} />
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};

export default SequenceSliderPanel;
