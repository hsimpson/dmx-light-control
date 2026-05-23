export enum FixtureChannelPreset {
  // color presets
  IntensityRed = 'IntensityRed',
  IntensityGreen = 'IntensityGreen',
  IntensityBlue = 'IntensityBlue',
  IntensityWhite = 'IntensityWhite',
  IntensityAmber = 'IntensityAmber',
  IntensityUV = 'IntensityUV',

  // shutter strobe presets
  ShutterStrobeSlowFast = 'ShutterStrobeSlowFast',
  ShutterStrobeFastSlow = 'ShutterStrobeFastSlow',

  // dimmer presets
  IntensityMasterDimmer = 'IntensityMasterDimmer',
  IntensityDimmer = 'IntensityDimmer',

  Custom = 'Custom',
}

const fixtureChannelNames: Record<FixtureChannelPreset, string> = {
  [FixtureChannelPreset.IntensityRed]: 'Red',
  [FixtureChannelPreset.IntensityGreen]: 'Green',
  [FixtureChannelPreset.IntensityBlue]: 'Blue',
  [FixtureChannelPreset.IntensityWhite]: 'White',
  [FixtureChannelPreset.IntensityAmber]: 'Amber',
  [FixtureChannelPreset.IntensityUV]: 'UV',
  [FixtureChannelPreset.ShutterStrobeSlowFast]: 'Shutter Strobe Slow-Fast',
  [FixtureChannelPreset.ShutterStrobeFastSlow]: 'Shutter Strobe Fast-Slow',
  [FixtureChannelPreset.IntensityMasterDimmer]: 'Master Dimmer',
  [FixtureChannelPreset.IntensityDimmer]: 'Dimmer',
  [FixtureChannelPreset.Custom]: 'Custom',
};

export const fixtureChannelPresetsName = (
  preset: FixtureChannelPreset,
): string => {
  return fixtureChannelNames[preset];
};
