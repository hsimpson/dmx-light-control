'use client';

import SelectableList from '@/components/selectable-list/selectable-list';
import { globalMessages } from '@/lib/i18n/global-messages';
import { useTranslation } from '@/lib/i18n/use-translation';
import { orderSorter } from '@/shared/sorter';
import { FixtureChannelDefinition, FixtureChannelRange } from '@/shared/types/fixtures';
import { FixtureChannelPreset } from '@/shared/types/graphql/graphql';
import { Flex, Text } from '@mantine/core';
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
  channelDefinitions.flatMap(definition =>
    definition.publicId ? [{ publicId: definition.publicId, name: definition.name }] : [],
  );

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

        <FixtureChannelRangeTable
          fixtureChannelRanges={selectedChannelDefinition?.fixtureChannelRanges ?? []}
          onAdd={handleChannelRangeAdd}
          onDelete={handleChannelRangeDelete}
        />
      </Flex>
    </Flex>
  );
};

export default FixtureChannelDefinitions;
