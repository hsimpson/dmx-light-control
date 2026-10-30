'use client';

import { useTranslation } from '@/lib/i18n/use-translation';
import { ColorSwatch, Group, NumberInput, Select, SimpleGrid, Stack, Switch, Text } from '@mantine/core';
import type { MidiLedOptionValues, MidiLedPaletteValues } from './midi-led-palettes';
import type { MidiFeedbackValues, MidiLedStateValues } from './midi-mapping-entry-values';

type MidiFeedbackFieldsProperties = {
  value: MidiFeedbackValues;
  onChange: (value: MidiFeedbackValues) => void;
  /** Named choices for the entry's LED type; without one, behavior and color are plain numbers. */
  palette?: MidiLedPaletteValues | undefined;
};

const DEFAULT_MONITOR: MidiLedStateValues = { behavior: 0, color: 1 };

type LedFieldProperties = {
  label: string;
  value: number;
  max: number;
  options: MidiLedOptionValues[];
  onChange: (value: number) => void;
};

/** A named dropdown when the palette has options, else a number input; values outside the list stay selectable. */
const LedField = ({ label, value, max, options, onChange }: LedFieldProperties) => {
  const { t } = useTranslation();
  if (options.length === 0) {
    return (
      <NumberInput
        label={label}
        min={0}
        max={max}
        allowDecimal={false}
        clampBehavior="strict"
        value={value}
        onChange={next => {
          onChange(Number(next));
        }}
      />
    );
  }
  const byValue = new Map<number, MidiLedOptionValues>();
  for (const option of options) {
    if (!byValue.has(option.value)) {
      byValue.set(option.value, option);
    }
  }
  const data = [...byValue.values()].map(option => ({ value: String(option.value), label: option.name }));
  if (!byValue.has(value)) {
    data.unshift({
      value: String(value),
      label: t({ id: 'MidiLedPalette.custom', defaultMessage: 'Custom ({value})' }, { value }),
    });
  }
  const swatch = (optionValue: number) => {
    const hex = byValue.get(optionValue)?.hex;
    return hex ? <ColorSwatch size={14} color={hex} /> : null;
  };
  return (
    <Select
      label={label}
      searchable
      allowDeselect={false}
      data={data}
      value={String(value)}
      leftSection={swatch(value)}
      renderOption={({ option }) => (
        <Group gap="xs" wrap="nowrap">
          {swatch(Number(option.value))}
          <Text size="sm">{option.label}</Text>
        </Group>
      )}
      onChange={next => {
        if (next !== null) {
          onChange(Number(next));
        }
      }}
    />
  );
};

/** Off/on LED states plus the optional monitor state (function runs, started elsewhere). */
const MidiFeedbackFields = ({ value, onChange, palette }: MidiFeedbackFieldsProperties) => {
  const { t } = useTranslation();

  const ledInputs = (state: 'off' | 'on' | 'monitor', label: string, led: MidiLedStateValues) => {
    const setLed = (changes: Partial<MidiLedStateValues>) => {
      onChange({ ...value, [state]: { ...led, ...changes } });
    };
    return (
      <SimpleGrid cols={2}>
        <LedField
          label={`${label}: ${t({ id: 'MidiMappingEntry.behavior', defaultMessage: 'Behavior (channel 0-15)' })}`}
          value={led.behavior}
          max={15}
          options={palette?.behaviors ?? []}
          onChange={behavior => {
            setLed({ behavior });
          }}
        />
        <LedField
          label={`${label}: ${t({ id: 'MidiMappingEntry.color', defaultMessage: 'Color (velocity 0-127)' })}`}
          value={led.color}
          max={127}
          options={palette?.colors ?? []}
          onChange={color => {
            setLed({ color });
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
