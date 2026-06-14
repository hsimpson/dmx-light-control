'use client';

import SelectableList from '@/components/selectable-list/selectable-list';
import { ICON_SIZE } from '@/lib/constants';
import { useTranslation } from '@/lib/i18n/use-translation';
import { orderSorter } from '@/shared/sorter';
import { FixtureChannelDefinition, FixtureChannelRange } from '@/shared/types/fixtures';
import { FixtureChannelPreset } from '@/shared/types/graphql/graphql';
import { globalMessages } from '@/lib/i18n/global-messages';
import { Flex, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ApertureIcon, LightbulbIcon, PencilIcon, RectangleIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import FixtureChannelRangeTable from './fixture-channel-range-table';

type FixtureChannelDefinitionsProps = {
  fixtureChannelDefinitions: FixtureChannelDefinition[];
};

const getPresetIcon = (preset: FixtureChannelPreset) => {
  const size = ICON_SIZE;

  switch (preset) {
    case FixtureChannelPreset.IntensityRed:
      return <RectangleIcon size={size} weight="duotone" color="red" />;
    case FixtureChannelPreset.IntensityGreen:
      return <RectangleIcon size={size} weight="duotone" color="green" />;
    case FixtureChannelPreset.IntensityBlue:
      return <RectangleIcon size={size} weight="duotone" color="blue" />;
    case FixtureChannelPreset.IntensityWhite:
      return <RectangleIcon size={size} weight="duotone" color="white" />;
    case FixtureChannelPreset.IntensityAmber:
      return <RectangleIcon size={size} weight="duotone" color="orange" />;
    case FixtureChannelPreset.IntensityUv:
      return <RectangleIcon size={size} weight="duotone" color="purple" />;
    case FixtureChannelPreset.IntensityDimmer:
    case FixtureChannelPreset.IntensityMasterDimmer:
      return <LightbulbIcon size={size} weight="duotone" color="orange" />;
    case FixtureChannelPreset.ShutterStrobeFastSlow:
    case FixtureChannelPreset.ShutterStrobeSlowFast:
      return <ApertureIcon size={size} weight="duotone" color="orange" />;
    case FixtureChannelPreset.Custom:
      return <PencilIcon size={size} weight="duotone" color="orange" />;
  }
};

const FixtureChannelDefinitions = ({ fixtureChannelDefinitions }: FixtureChannelDefinitionsProps) => {
  const { t } = useTranslation();
  const [channelDefinitions, setChannelDefinitions] = useState(fixtureChannelDefinitions.toSorted(orderSorter));
  const [selectedChannelDefinition, setSelectedChannelDefinition] = useState<FixtureChannelDefinition | undefined>(
    channelDefinitions[0],
  );

  const handleSelectedChannelDefinitionChange = (item?: FixtureChannelDefinition) => {
    setSelectedChannelDefinition(item);
  };

  const handleChannelDefinitionAdd = (name: string) => {
    const newChannelDefinition: Partial<FixtureChannelDefinition> = {
      name,
      preset: FixtureChannelPreset.Custom,
      fixtureChannelRanges: [],
      order: channelDefinitions.length,
    };
    const newChannelDefinitions = [...channelDefinitions, newChannelDefinition];
    setChannelDefinitions(newChannelDefinitions as FixtureChannelDefinition[]);
    handleSelectedChannelDefinitionChange(newChannelDefinition as FixtureChannelDefinition);
  };

  const handleChannelDefinitionRemove = (itemToRemove: FixtureChannelDefinition) => {
    const newChannelDefinitions = channelDefinitions.filter(i => i !== itemToRemove);
    setChannelDefinitions(newChannelDefinitions);
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
    const newChannelDefinitions = channelDefinitions.map(cd =>
      cd === selectedChannelDefinition ? newChannelDefinition : cd,
    );
    setChannelDefinitions(newChannelDefinitions);
    setSelectedChannelDefinition(newChannelDefinition);
  };

  const handleChannelRangeDelete = (rangeToDelete: FixtureChannelRange) => {
    if (!selectedChannelDefinition) {
      return;
    }

    const newChannelRanges = selectedChannelDefinition.fixtureChannelRanges.filter(r => r !== rangeToDelete);
    const newChannelDefinition = { ...selectedChannelDefinition, fixtureChannelRanges: newChannelRanges };
    const newChannelDefinitions = channelDefinitions.map(cd =>
      cd === selectedChannelDefinition ? newChannelDefinition : cd,
    );
    setChannelDefinitions(newChannelDefinitions);
    setSelectedChannelDefinition(newChannelDefinition);
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
          addNewItemPlaceholder={t({
            id: 'FixtureChannelDefinitions.addNewItemPlaceholder',
            defaultMessage: 'Add Channel Definition',
          })}
          items={channelDefinitions}
          accessor="name"
          keyAccessor="name"
          itemRenderer={item => (
            <Flex direction="row" align="center" gap="sm">
              {getPresetIcon(item.preset)}
              <span>{item.name}</span>
            </Flex>
          )}
          selectedItem={selectedChannelDefinition}
          onSelectedItemChange={handleSelectedChannelDefinitionChange}
          onItemAdd={handleChannelDefinitionAdd}
          onItemRemove={handleChannelDefinitionRemove}
        />
      </Flex>

      <Flex direction="column" gap="md">
        <Text size="md">
          {t({
            id: 'FixtureChannelDefinitions.details',
            defaultMessage: 'Channel Definition Details',
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
