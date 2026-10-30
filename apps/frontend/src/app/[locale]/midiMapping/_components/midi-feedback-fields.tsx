'use client';

import { useTranslation } from '@/lib/i18n/use-translation';
import { NumberInput, SimpleGrid, Stack, Switch } from '@mantine/core';
import type { MidiFeedbackValues, MidiLedStateValues } from './midi-mapping-entry-values';

type MidiFeedbackFieldsProperties = {
  value: MidiFeedbackValues;
  onChange: (value: MidiFeedbackValues) => void;
};

const DEFAULT_MONITOR: MidiLedStateValues = { behavior: 0, color: 1 };

/** Off/on LED states plus the optional monitor state (function runs, started elsewhere). */
const MidiFeedbackFields = ({ value, onChange }: MidiFeedbackFieldsProperties) => {
  const { t } = useTranslation();

  const ledInputs = (state: 'off' | 'on' | 'monitor', label: string, led: MidiLedStateValues) => {
    const setLed = (changes: Partial<MidiLedStateValues>) => {
      onChange({ ...value, [state]: { ...led, ...changes } });
    };
    return (
      <SimpleGrid cols={2}>
        <NumberInput
          label={`${label}: ${t({ id: 'MidiMappingEntry.behavior', defaultMessage: 'Behavior (channel 0-15)' })}`}
          min={0}
          max={15}
          allowDecimal={false}
          clampBehavior="strict"
          value={led.behavior}
          onChange={next => {
            setLed({ behavior: Number(next) });
          }}
        />
        <NumberInput
          label={`${label}: ${t({ id: 'MidiMappingEntry.color', defaultMessage: 'Color (velocity 0-127)' })}`}
          min={0}
          max={127}
          allowDecimal={false}
          clampBehavior="strict"
          value={led.color}
          onChange={next => {
            setLed({ color: Number(next) });
          }}
        />
      </SimpleGrid>
    );
  };

  const monitorLabel = t({ id: 'MidiMappingEntry.monitor', defaultMessage: 'Monitor' });
  return (
    <Stack gap="xs">
      {ledInputs('off', t({ id: 'MidiMappingEntry.off', defaultMessage: 'Off' }), value.off)}
      {ledInputs('on', t({ id: 'MidiMappingEntry.on', defaultMessage: 'On' }), value.on)}
      <Switch
        label={t({
          id: 'MidiMappingEntry.hasMonitor',
          defaultMessage: 'Monitor state: the function runs but was started elsewhere',
        })}
        checked={value.monitor !== null}
        onChange={event => {
          onChange({ ...value, monitor: event.currentTarget.checked ? DEFAULT_MONITOR : null });
        }}
      />
      {value.monitor ? ledInputs('monitor', monitorLabel, value.monitor) : null}
    </Stack>
  );
};

export default MidiFeedbackFields;
