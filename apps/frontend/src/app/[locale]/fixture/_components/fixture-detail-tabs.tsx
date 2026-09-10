'use client';

import { useTranslation } from '@/lib/i18n/use-translation';
import { Tabs } from '@mantine/core';
import { useParams, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  DEFAULT_FIXTURE_DETAIL_TAB,
  FIXTURE_DETAIL_TABS,
  isValidFixtureDetailTab,
  type FixtureDetailTab,
} from './fixture-detail-tabs.constants';
import classes from './fixture-detail-tabs.module.css';
import FixtureTabEmptyState from './fixture-tab-empty-state';

type FixtureDetailTabsProperties = {
  fixturePublicId: string;
  general: ReactNode;
  channels: ReactNode;
  channelModes: ReactNode;
};

const getFixtureTabHref = (fixturePublicId: string, tab: FixtureDetailTab) => `/fixture/${fixturePublicId}/${tab}`;

const FixtureDetailTabs = ({ fixturePublicId, general, channels, channelModes }: FixtureDetailTabsProperties) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { tab } = useParams<{ tab?: string }>();
  const activeTab = tab && isValidFixtureDetailTab(tab) ? tab : DEFAULT_FIXTURE_DETAIL_TAB;

  const handleTabChange = (value: string | null) => {
    if (!value || !isValidFixtureDetailTab(value)) {
      return;
    }

    router.push(getFixtureTabHref(fixturePublicId, value));
  };

  const tabLabels: Record<FixtureDetailTab, string> = {
    general: t({ id: 'FixtureDetail.tabs.general', defaultMessage: 'General' }),
    properties: t({ id: 'FixtureDetail.tabs.properties', defaultMessage: 'Properties' }),
    channels: t({ id: 'FixtureDetail.tabs.channels', defaultMessage: 'Channels' }),
    'channel-modes': t({ id: 'FixtureDetail.tabs.channelModes', defaultMessage: 'Channel modes' }),
  };

  return (
    <Tabs value={activeTab} onChange={handleTabChange} className={classes.root}>
      <Tabs.List>
        {FIXTURE_DETAIL_TABS.map(tabValue => (
          <Tabs.Tab key={tabValue} value={tabValue}>
            {tabLabels[tabValue]}
          </Tabs.Tab>
        ))}
      </Tabs.List>

      <Tabs.Panel value="general" pt="md">
        {general}
      </Tabs.Panel>

      <Tabs.Panel value="properties" pt="md">
        <FixtureTabEmptyState
          message={t({ id: 'FixtureDetail.emptyView', defaultMessage: 'This view is not available yet.' })}
        />
      </Tabs.Panel>

      <Tabs.Panel value="channels" pt="md">
        {channels}
      </Tabs.Panel>

      <Tabs.Panel value="channel-modes" pt="md">
        {channelModes}
      </Tabs.Panel>
    </Tabs>
  );
};

export default FixtureDetailTabs;
