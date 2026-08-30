import { FixtureChannelDefinition } from '@/shared/types/fixtures';
import { FixturePresetIcon } from '@/lib/fixtures/fixture-preset-icon';
import { Flex } from '@mantine/core';

type FixtureChannelDefinitionItemProps = {
  channelDefinition: Pick<FixtureChannelDefinition, 'name' | 'preset'>;
};

const FixtureChannelDefinitionItem = ({ channelDefinition }: FixtureChannelDefinitionItemProps) => (
  <Flex direction="row" align="center" gap="sm">
    <FixturePresetIcon preset={channelDefinition.preset} />
    <span>{channelDefinition.name}</span>
  </Flex>
);

export default FixtureChannelDefinitionItem;
