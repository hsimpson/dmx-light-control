import { ICON_SIZE } from '@/lib/constants';
import { FixtureChannelDefinition } from '@/shared/types/fixtures';
import { FixtureChannelPreset } from '@/shared/types/graphql/graphql';
import { Flex } from '@mantine/core';
import { ApertureIcon, LightbulbIcon, PencilIcon, RectangleIcon } from '@phosphor-icons/react';

type FixtureChannelDefinitionItemProps = {
  channelDefinition: Pick<FixtureChannelDefinition, 'name' | 'preset'>;
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

const FixtureChannelDefinitionItem = ({ channelDefinition }: FixtureChannelDefinitionItemProps) => (
  <Flex direction="row" align="center" gap="sm">
    {getPresetIcon(channelDefinition.preset)}
    <span>{channelDefinition.name}</span>
  </Flex>
);

export default FixtureChannelDefinitionItem;
