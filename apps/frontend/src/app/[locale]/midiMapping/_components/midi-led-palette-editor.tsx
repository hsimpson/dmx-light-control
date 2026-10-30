'use client';

import { ICON_SIZE } from '@/lib/constants';
import { globalMessages } from '@/lib/i18n/global-messages';
import { useTranslation } from '@/lib/i18n/use-translation';
import { MidiLedType, UpdateMidiMappingDocument, type MidiMappingFieldsFragment } from '@/shared/types/graphql/graphql';
import { useMutation } from '@apollo/client/react';
import {
  ActionIcon,
  Button,
  ColorSwatch,
  Group,
  NumberInput,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { PlusCircleIcon, TrashIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import {
  palettesInput,
  palettesValues,
  type MidiLedOptionValues,
  type MidiLedPalettesValues,
} from './midi-led-palettes';

type OptionTableProperties = {
  label: string;
  options: MidiLedOptionValues[];
  max: number;
  maxCount: number;
  withHex: boolean;
  onChange: (options: MidiLedOptionValues[]) => void;
};

const OptionTable = ({ label, options, max, maxCount, withHex, onChange }: OptionTableProperties) => {
  const { t } = useTranslation();
  const patch = (index: number, changes: Partial<MidiLedOptionValues>) => {
    onChange(options.map((option, current) => (current === index ? { ...option, ...changes } : option)));
  };

  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Text fw={500}>{label}</Text>
        <Button
          size="xs"
          variant="light"
          disabled={options.length >= maxCount}
          aria-label={`${label}: ${t({ id: 'MidiLedPalette.addOption', defaultMessage: 'Add' })}`}
          leftSection={<PlusCircleIcon size={ICON_SIZE} weight="duotone" />}
          onClick={() => {
            onChange([...options, { name: '', value: 0, hex: null }]);
          }}
        >
          {t({ id: 'MidiLedPalette.addOption', defaultMessage: 'Add' })}
        </Button>
      </Group>
      <ScrollArea.Autosize mah={360}>
        <Table>
          <Table.Tbody>
            {options.map((option, index) => (
              <Table.Tr key={index}>
                <Table.Td>
                  <TextInput
                    size="xs"
                    aria-label={`${label} ${index + 1}: ${t({ id: 'MidiLedPalette.name', defaultMessage: 'Name' })}`}
                    value={option.name}
                    onChange={event => {
                      patch(index, { name: event.currentTarget.value });
                    }}
                  />
                </Table.Td>
                <Table.Td w={90}>
                  <NumberInput
                    size="xs"
                    aria-label={`${label} ${index + 1}: ${t({ id: 'MidiLedPalette.value', defaultMessage: 'Value' })}`}
                    min={0}
                    max={max}
                    allowDecimal={false}
                    clampBehavior="strict"
                    value={option.value}
                    onChange={value => {
                      patch(index, { value: Number(value) });
                    }}
                  />
                </Table.Td>
                {withHex ? (
                  <Table.Td w={130}>
                    <TextInput
                      size="xs"
                      aria-label={`${label} ${index + 1}: ${t({ id: 'MidiLedPalette.hex', defaultMessage: 'Swatch' })}`}
                      placeholder="#RRGGBB"
                      leftSection={option.hex ? <ColorSwatch size={14} color={option.hex} /> : null}
                      value={option.hex ?? ''}
                      onChange={event => {
                        patch(index, { hex: event.currentTarget.value || null });
                      }}
                    />
                  </Table.Td>
                ) : null}
                <Table.Td w={40}>
                  <ActionIcon
                    variant="subtle"
                    aria-label={`${label} ${index + 1}: ${t({ id: 'MidiLedPalette.remove', defaultMessage: 'Remove' })}`}
                    onClick={() => {
                      onChange(options.filter((_, current) => current !== index));
                    }}
                  >
                    <TrashIcon size={ICON_SIZE} weight="fill" />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea.Autosize>
    </Stack>
  );
};

type MidiLedPaletteEditorProperties = {
  mapping: Pick<MidiMappingFieldsFragment, 'publicId' | 'name' | 'ledPalettes'>;
};

/** Named LED behaviors and colors per LED type; the feedback editors offer these instead of raw numbers. */
const MidiLedPaletteEditor = ({ mapping }: MidiLedPaletteEditorProperties) => {
  const { t } = useTranslation();
  const [values, setValues] = useState<MidiLedPalettesValues>(() => palettesValues(mapping.ledPalettes));
  const [updateMapping, { loading: saving }] = useMutation(UpdateMidiMappingDocument);

  const setPalette = (ledType: MidiLedType, part: 'behaviors' | 'colors', options: MidiLedOptionValues[]) => {
    setValues(current => ({ ...current, [ledType]: { ...current[ledType], [part]: options } }));
  };

  const handleSave = async () => {
    try {
      await updateMapping({
        variables: { input: { publicId: mapping.publicId, name: mapping.name, ledPalettes: palettesInput(values) } },
      });
      notifications.show({
        color: 'green',
        message: t({ id: 'MidiLedPalette.saved', defaultMessage: 'LED colors and behaviors saved' }),
      });
    } catch {
      notifications.show({
        color: 'red',
        title: t(globalMessages.error),
        message: t({
          id: 'MidiLedPalette.saveError',
          defaultMessage: 'Failed to save LED colors and behaviors. Names are required and swatches must be #RRGGBB.',
        }),
      });
    }
  };

  const panel = (ledType: MidiLedType) => (
    <SimpleGrid cols={{ base: 1, md: 2 }} pt="sm">
      <OptionTable
        label={t({ id: 'MidiLedPalette.behaviors', defaultMessage: 'Behaviors (channel 0-15)' })}
        options={values[ledType].behaviors}
        max={15}
        maxCount={16}
        withHex={false}
        onChange={options => {
          setPalette(ledType, 'behaviors', options);
        }}
      />
      <OptionTable
        label={t({ id: 'MidiLedPalette.colors', defaultMessage: 'Colors (velocity 0-127)' })}
        options={values[ledType].colors}
        max={127}
        maxCount={128}
        withHex
        onChange={options => {
          setPalette(ledType, 'colors', options);
        }}
      />
    </SimpleGrid>
  );

  return (
    <Stack mt="xl">
      <Group justify="space-between">
        <Title order={3}>{t({ id: 'MidiLedPalette.title', defaultMessage: 'LED colors and behaviors' })}</Title>
        <Group gap="sm">
          <Button loading={saving} onClick={() => void handleSave()}>
            {t({ id: 'MidiLedPalette.save', defaultMessage: 'Save LED colors' })}
          </Button>
        </Group>
      </Group>
      <Tabs defaultValue={MidiLedType.Rgb} keepMounted={false}>
        <Tabs.List>
          <Tabs.Tab value={MidiLedType.Rgb}>{t({ id: 'MidiLedType.rgb', defaultMessage: 'RGB LED' })}</Tabs.Tab>
          <Tabs.Tab value={MidiLedType.Single}>
            {t({ id: 'MidiLedType.single', defaultMessage: 'Single-color LED' })}
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value={MidiLedType.Rgb}>{panel(MidiLedType.Rgb)}</Tabs.Panel>
        <Tabs.Panel value={MidiLedType.Single}>{panel(MidiLedType.Single)}</Tabs.Panel>
      </Tabs>
    </Stack>
  );
};

export default MidiLedPaletteEditor;
