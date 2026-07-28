import SelectableList from '@/components/selectable-list/selectable-list';
import { useTranslation } from '@/lib/i18n/use-translation';
import { orderSorter } from '@/shared/sorter';
import { FixtureChannelMode } from '@/shared/types/fixtures';
import { Flex, Text } from '@mantine/core';
import { useState } from 'react';

type FixtureChannelModesProps = {
  fixtureChannelModes: FixtureChannelMode[];
};

const FixtureChannelModes = ({ fixtureChannelModes }: FixtureChannelModesProps) => {
  const { t } = useTranslation();
  const [channelModes, setChannelModes] = useState(fixtureChannelModes.toSorted(orderSorter));
  const [selectedChannelMode, setSelectedChannelMode] = useState<FixtureChannelMode | undefined>(channelModes[0]);

  const handleSelectedChannelModeChange = (item?: FixtureChannelMode) => {
    setSelectedChannelMode(item);
  };

  const handleChannelModeAdd = (name: string) => {
    const newChannelMode: Partial<FixtureChannelMode> = {
      name,
    };
    setChannelModes(prev => [...prev, newChannelMode as FixtureChannelMode].toSorted(orderSorter));
  };

  const handleChannelModeRemove = (item: FixtureChannelMode) => {
    setChannelModes(prev => prev.filter(mode => mode.name !== item.name));
  };

  console.log(selectedChannelMode);

  return (
    <Flex direction="row" gap="xl">
      <Flex direction="column" gap="md">
        <Text size="md">
          {t({
            id: 'FixtureChannelModes.listTitle',
            defaultMessage: 'Channel Modes',
          })}
        </Text>
        <SelectableList
          addNewItemPlaceholder={t({
            id: 'FixtureChannelModes.addNewItemPlaceholder',
            defaultMessage: 'Add new channel mode',
          })}
          items={channelModes}
          accessor="name"
          keyAccessor="name"
          selectedItem={selectedChannelMode}
          onSelectedItemChange={handleSelectedChannelModeChange}
          onItemAdd={handleChannelModeAdd}
          onItemRemove={handleChannelModeRemove}
        />
      </Flex>
    </Flex>
  );
};

export default FixtureChannelModes;
