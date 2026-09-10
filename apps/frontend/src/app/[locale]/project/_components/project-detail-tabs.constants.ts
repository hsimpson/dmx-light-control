export const PROJECT_DETAIL_TABS = ['fixtures', 'universe', 'dmx', '2d', '3d'] as const;

export type ProjectDetailTab = (typeof PROJECT_DETAIL_TABS)[number];

export const DEFAULT_PROJECT_DETAIL_TAB: ProjectDetailTab = 'fixtures';

export const isValidProjectDetailTab = (tab: string): tab is ProjectDetailTab =>
  (PROJECT_DETAIL_TABS as readonly string[]).includes(tab);
