export const FIXTURE_DETAIL_TABS = ['general', 'properties', 'channels', 'channel-modes'] as const;

export type FixtureDetailTab = (typeof FIXTURE_DETAIL_TABS)[number];

export const DEFAULT_FIXTURE_DETAIL_TAB: FixtureDetailTab = 'general';

export const isValidFixtureDetailTab = (tab: string): tab is FixtureDetailTab =>
  (FIXTURE_DETAIL_TABS as readonly string[]).includes(tab);
