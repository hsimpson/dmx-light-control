import { ICON_SIZE } from '@/lib/constants';
import { FixtureChannelPreset } from '@/shared/types/graphql/graphql';
import { ApertureIcon, LightbulbIcon, PaletteIcon, PencilIcon, RectangleIcon } from '@phosphor-icons/react';
import type { ReactElement } from 'react';

type FixturePresetIconProperties = {
  preset: FixtureChannelPreset;
  size?: number;
  className?: string;
};

export function FixturePresetIcon({ preset, size = ICON_SIZE, className }: FixturePresetIconProperties): ReactElement {
  const icon = (() => {
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
      case FixtureChannelPreset.ColorMacro:
        return <PaletteIcon size={size} weight="duotone" color="red" />;
      case FixtureChannelPreset.IntensityDimmer:
      case FixtureChannelPreset.IntensityMasterDimmer:
        return <LightbulbIcon size={size} weight="duotone" color="orange" />;
      case FixtureChannelPreset.ShutterStrobeFastSlow:
      case FixtureChannelPreset.ShutterStrobeSlowFast:
        return <ApertureIcon size={size} weight="duotone" color="orange" />;
      case FixtureChannelPreset.Custom:
        return <PencilIcon size={size} weight="duotone" color="orange" />;
    }
  })();

  return className ? <span className={className}>{icon}</span> : icon;
}
