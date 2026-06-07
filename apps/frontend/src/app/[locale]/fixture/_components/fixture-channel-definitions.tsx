'use client';

import SelectableList from '@/components/selectable-list/selectable-list';
import { ICON_SIZE } from '@/lib/constants';
import { useTranslation } from '@/lib/i18n/use-translation';
import { FixtureChannelPreset } from '@/shared/types/graphql/graphql';
import { Flex } from '@mantine/core';
import { ApertureIcon, LightbulbIcon, PencilIcon, RectangleIcon } from '@phosphor-icons/react';
import { useState } from 'react';

type MinimalChannelDefinition = {
  name: string;
  preset: FixtureChannelPreset;
  fixtureChannelRanges: {
    dmxStart: number;
    dmxEnd: number;
    description: string;
  }[];
};

type FixtureChannelDefinitionsProps = {
  fixtureChannelDefinitions: MinimalChannelDefinition[];
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
  const [channelDefinitions, setChannelDefinitions] = useState<MinimalChannelDefinition[]>(fixtureChannelDefinitions);
  const [selectedChannelDefinition, setSelectedChannelDefinition] = useState<MinimalChannelDefinition | undefined>(
    fixtureChannelDefinitions[0],
  );

  const handleSelectedChannelDefinitionChange = (item?: MinimalChannelDefinition) => {
    setSelectedChannelDefinition(item);
  };

  const handleChannelDefinitionAdd = (name: string) => {
    const newChannelDefinition: MinimalChannelDefinition = {
      name,
      preset: FixtureChannelPreset.Custom,
      fixtureChannelRanges: [],
    };
    const newChannelDefinitions = [...channelDefinitions, newChannelDefinition];
    setChannelDefinitions(newChannelDefinitions);
    handleSelectedChannelDefinitionChange(newChannelDefinition);
  };

  const handleChannelDefinitionRemove = (itemToRemove: MinimalChannelDefinition) => {
    const newChannelDefinitions = channelDefinitions.filter(i => i !== itemToRemove);
    setChannelDefinitions(newChannelDefinitions);
  };

  return (
    <Flex direction="row" gap="xl">
      <SelectableList
        title={t({
          id: 'FixtureChannelDefinitions.listTitle',
          defaultMessage: 'Channel Definitions',
        })}
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
      ></SelectableList>
      <Flex direction="column" gap="md">
        <div>
          {t({
            id: 'FixtureChannelDefinitions.details',
            defaultMessage: 'Channel Definition Details',
          })}
        </div>
      </Flex>
    </Flex>
  );
};

export default FixtureChannelDefinitions;
