'use client';

import SelectableList from '@/components/selectable-list/selectable-list';
import { globalMessages } from '@/lib/i18n/global-messages';
import { useTranslation } from '@/lib/i18n/use-translation';
import { orderSorter } from '@/shared/sorter';
import { FixtureChannelDefinition, FixtureChannelRange } from '@/shared/types/fixtures';
import { FixtureChannelPreset } from '@/shared/types/graphql/graphql';
import { Flex, Select, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import FixtureChannelDefinitionItem from './fixture-channel-definition-item';
import FixtureChannelRangeTable from './fixture-channel-range-table';

export type EditorChannelDefinition = Omit<FixtureChannelDefinition, 'publicId'> & {
  clientKey: string;
  publicId?: string;
};

export const toEditorChannelDefinitions = (
  fixtureChannelDefinitions: FixtureChannelDefinition[],
): EditorChannelDefinition[] =>
  fixtureChannelDefinitions.toSorted(orderSorter).map(definition => ({
    ...definition,
    clientKey: definition.publicId,
  }));

export const toChannelDefinitionSaveInputs = (channelDefinitions: EditorChannelDefinition[]) =>
  channelDefinitions.map((definition, index) => ({
    ...(definition.publicId ? { publicId: definition.publicId } : {}),
    name: definition.name,
    preset: definition.preset,
    order: index,
    ranges: definition.fixtureChannelRanges.map(range => ({
      ...(range.publicId ? { publicId: range.publicId } : {}),
      dmxStart: range.dmxStart,
      dmxEnd: range.dmxEnd,
      description: range.description,
    })),
  }));

type FixtureChannelDefinitionsProps = {
  channelDefinitions: EditorChannelDefinition[];
  onChannelDefinitionsChange: (channelDefinitions: EditorChannelDefinition[]) => void;
};

const FixtureChannelDefinitions = ({
  channelDefinitions,
  onChannelDefinitionsChange,
}: FixtureChannelDefinitionsProps) => {
  const { t } = useTranslation();
  const [selectedClientKey, setSelectedClientKey] = useState(channelDefinitions[0]?.clientKey);
  const selectedChannelDefinition =
    channelDefinitions.find(definition => definition.clientKey === selectedClientKey) ?? channelDefinitions[0];

  const handleSelectedChannelDefinitionChange = (item?: EditorChannelDefinition) => {
    setSelectedClientKey(item?.clientKey);
  };

  const handleChannelDefinitionAdd = (name: string) => {
    const newChannelDefinition = {
      clientKey: crypto.randomUUID(),
      name,
      preset: FixtureChannelPreset.Custom,
      fixtureChannelRanges: [],
      order: channelDefinitions.length,
    } as unknown as EditorChannelDefinition;
    onChannelDefinitionsChange([...channelDefinitions, newChannelDefinition]);
    handleSelectedChannelDefinitionChange(newChannelDefinition);
  };

  const handleChannelDefinitionRemove = (itemToRemove: EditorChannelDefinition) => {
    onChannelDefinitionsChange(
      channelDefinitions.filter(definition => definition.clientKey !== itemToRemove.clientKey),
    );
  };

  const handleChannelDefinitionRename = (item: EditorChannelDefinition, newName: string) => {
    onChannelDefinitionsChange(
      channelDefinitions.map(definition =>
        definition.clientKey === item.clientKey ? { ...definition, name: newName } : definition,
      ),
    );
  };

  const handleChannelDefinitionPresetChange = (item: EditorChannelDefinition, newPreset: FixtureChannelPreset) => {
    onChannelDefinitionsChange(
      channelDefinitions.map(definition =>
        definition.clientKey === item.clientKey ? { ...definition, preset: newPreset } : definition,
      ),
    );
  };

  const handleChannelDefinitionReorder = (reordered: EditorChannelDefinition[]) => {
    onChannelDefinitionsChange(reordered);
  };

  const handleChannelRangeAdd = (start: number, end: number, description: string) => {
    if (!selectedChannelDefinition) {
      return;
    }

    if (selectedChannelDefinition.fixtureChannelRanges.some(r => r.description === description)) {
      notifications.show({
        color: 'red',
        title: t(globalMessages.error),
        message: t({ id: 'SelectableList.itemAlreadyExists', defaultMessage: 'Item already exists' }),
      });
      return;
    }

    const newRange: Partial<FixtureChannelRange> = {
      dmxStart: start,
      dmxEnd: end,
      description,
    };
    const newChannelRanges = [...selectedChannelDefinition.fixtureChannelRanges, newRange as FixtureChannelRange];
    const newChannelDefinition = { ...selectedChannelDefinition, fixtureChannelRanges: newChannelRanges };
    onChannelDefinitionsChange(
      channelDefinitions.map(definition =>
        definition.clientKey === selectedChannelDefinition.clientKey ? newChannelDefinition : definition,
      ),
    );
  };

  const handleChannelRangeBulkAdd = (ranges: { dmxStart: number; dmxEnd: number; description: string }[]) => {
    if (!selectedChannelDefinition) {
      notifications.show({
        color: 'red',
        title: t(globalMessages.error),
        message: t({
          id: 'FixtureChannelRangeTable.importNoDefinition',
          defaultMessage: 'Select a channel definition before importing ranges',
        }),
      });
      return false;
    }

    const existingDescriptions = new Set(
      selectedChannelDefinition.fixtureChannelRanges.map(range => range.description),
    );
    const rangesToAdd: { dmxStart: number; dmxEnd: number; description: string }[] = [];
    const skippedDescriptions: string[] = [];

    for (const range of ranges) {
      if (
        existingDescriptions.has(range.description) ||
        rangesToAdd.some(item => item.description === range.description)
      ) {
        if (!skippedDescriptions.includes(range.description)) {
          skippedDescriptions.push(range.description);
        }
        continue;
      }

      rangesToAdd.push(range);
    }

    if (rangesToAdd.length === 0) {
      notifications.show({
        color: 'red',
        title: t(globalMessages.error),
        message: t(
          {
            id: 'FixtureChannelRangeTable.importDuplicateDescription',
            defaultMessage: 'Duplicate description(s): {descriptions}',
          },
          { descriptions: skippedDescriptions.join(', ') },
        ),
      });
      return false;
    }

    if (skippedDescriptions.length > 0) {
      notifications.show({
        color: 'yellow',
        title: t(globalMessages.warning),
        message: t(
          {
            id: 'FixtureChannelRangeTable.importSkippedDuplicates',
            defaultMessage: 'Skipped duplicate description(s): {descriptions}',
          },
          { descriptions: skippedDescriptions.join(', ') },
        ),
      });
    }

    const newRanges = rangesToAdd.map(
      range =>
        ({
          dmxStart: range.dmxStart,
          dmxEnd: range.dmxEnd,
          description: range.description,
        }) as FixtureChannelRange,
    );
    const newChannelDefinition = {
      ...selectedChannelDefinition,
      fixtureChannelRanges: [...selectedChannelDefinition.fixtureChannelRanges, ...newRanges],
    };
    onChannelDefinitionsChange(
      channelDefinitions.map(definition =>
        definition.clientKey === selectedChannelDefinition.clientKey ? newChannelDefinition : definition,
      ),
    );
    return true;
  };

  const handleChannelRangeEdit = (
    rangeToEdit: FixtureChannelRange,
    start: number,
    end: number,
    description: string,
  ) => {
    if (!selectedChannelDefinition) {
      return;
    }

    if (
      selectedChannelDefinition.fixtureChannelRanges.some(
        range => range !== rangeToEdit && range.description === description,
      )
    ) {
      notifications.show({
        color: 'red',
        title: t(globalMessages.error),
        message: t({ id: 'SelectableList.itemAlreadyExists', defaultMessage: 'Item already exists' }),
      });
      return;
    }

    const newChannelRanges = selectedChannelDefinition.fixtureChannelRanges.map(range =>
      range === rangeToEdit ? { ...range, dmxStart: start, dmxEnd: end, description } : range,
    );
    const newChannelDefinition = { ...selectedChannelDefinition, fixtureChannelRanges: newChannelRanges };
    onChannelDefinitionsChange(
      channelDefinitions.map(definition =>
        definition.clientKey === selectedChannelDefinition.clientKey ? newChannelDefinition : definition,
      ),
    );
  };

  const handleChannelRangeDelete = (rangeToDelete: FixtureChannelRange) => {
    if (!selectedChannelDefinition) {
      return;
    }

    const newChannelRanges = selectedChannelDefinition.fixtureChannelRanges.filter(r => r !== rangeToDelete);
    const newChannelDefinition = { ...selectedChannelDefinition, fixtureChannelRanges: newChannelRanges };
    onChannelDefinitionsChange(
      channelDefinitions.map(definition =>
        definition.clientKey === selectedChannelDefinition.clientKey ? newChannelDefinition : definition,
      ),
    );
  };

  return (
    <Flex direction="row" gap="xl">
      <Flex direction="column" gap="md">
        <Text size="md">
          {t({
            id: 'FixtureChannelDefinitions.listTitle',
            defaultMessage: 'Channel Definitions',
          })}
        </Text>
        <SelectableList
          addNewItem
          addNewItemPlaceholder={t({
            id: 'FixtureChannelDefinitions.addNewItemPlaceholder',
            defaultMessage: 'Add Channel Definition',
          })}
          items={channelDefinitions}
          accessor="name"
          keyAccessor="clientKey"
          itemRenderer={item => <FixtureChannelDefinitionItem channelDefinition={item} />}
          selectedItem={selectedChannelDefinition}
          onSelectedItemChange={handleSelectedChannelDefinitionChange}
          onItemAdd={handleChannelDefinitionAdd}
          onItemRemove={handleChannelDefinitionRemove}
          onItemReorder={handleChannelDefinitionReorder}
          onItemRename={handleChannelDefinitionRename}
        />
      </Flex>

      <Flex direction="column" gap="md">
        <Text size="md">
          {t({
            id: 'FixtureChannelDefinitions.details',
            defaultMessage: 'Channel ranges',
          })}
        </Text>

        {selectedChannelDefinition && (
          <Select
            label={t({
              id: 'FixtureChannelDefinitions.presetLabel',
              defaultMessage: 'Preset',
            })}
            data={[
              FixtureChannelPreset.Custom,
              FixtureChannelPreset.IntensityRed,
              FixtureChannelPreset.IntensityGreen,
              FixtureChannelPreset.IntensityBlue,
              FixtureChannelPreset.IntensityWhite,
              FixtureChannelPreset.IntensityAmber,
              FixtureChannelPreset.IntensityUv,
              FixtureChannelPreset.ColorMacro,
              FixtureChannelPreset.IntensityMasterDimmer,
              FixtureChannelPreset.IntensityDimmer,
              FixtureChannelPreset.ShutterStrobeSlowFast,
              FixtureChannelPreset.ShutterStrobeFastSlow,
            ].map(preset => ({ value: preset, label: preset }))}
            value={selectedChannelDefinition.preset}
            onChange={preset => {
              if (preset) {
                handleChannelDefinitionPresetChange(selectedChannelDefinition, preset);
              }
            }}
            allowDeselect={false}
            w={240}
          />
        )}

        <FixtureChannelRangeTable
          fixtureChannelRanges={selectedChannelDefinition?.fixtureChannelRanges ?? []}
          onAdd={handleChannelRangeAdd}
          onBulkAdd={handleChannelRangeBulkAdd}
          onEdit={handleChannelRangeEdit}
          onDelete={handleChannelRangeDelete}
        />
      </Flex>
    </Flex>
  );
};

export default FixtureChannelDefinitions;
