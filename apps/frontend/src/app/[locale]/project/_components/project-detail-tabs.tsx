'use client';

import { useTranslation } from '@/lib/i18n/use-translation';
import { Tabs } from '@mantine/core';
import { useParams, useRouter } from 'next/navigation';
import {
  DEFAULT_PROJECT_DETAIL_TAB,
  isValidProjectDetailTab,
  PROJECT_DETAIL_TABS,
  type ProjectDetailTab,
} from './project-detail-tabs.constants';
import classes from './project-detail-tabs.module.css';
import DmxView from './dmx-view';
import ProjectFixtureTable from './project-fixture-table';
import ProjectTabEmptyState from './project-tab-empty-state';
import ThreeDView from './three-d-view';
import UniverseView from './universe-view';
import VirtualConsoleView from './virtual-console-view';

type ProjectDetailTabsProperties = {
  projectPublicId: string;
};

const getProjectTabHref = (projectPublicId: string, tab: ProjectDetailTab) => `/project/${projectPublicId}/${tab}`;

const ProjectDetailTabs = ({ projectPublicId }: ProjectDetailTabsProperties) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { tab } = useParams<{ tab?: string }>();
  const activeTab = tab && isValidProjectDetailTab(tab) ? tab : DEFAULT_PROJECT_DETAIL_TAB;

  const handleTabChange = (value: string | null) => {
    if (!value || !isValidProjectDetailTab(value)) {
      return;
    }

    router.push(getProjectTabHref(projectPublicId, value));
  };

  const tabLabels: Record<ProjectDetailTab, string> = {
    fixtures: t({ id: 'ProjectDetail.tabs.fixtures', defaultMessage: 'Fixtures' }),
    universe: t({ id: 'ProjectDetail.tabs.universeView', defaultMessage: 'Universe View' }),
    dmx: t({ id: 'ProjectDetail.tabs.dmxView', defaultMessage: 'DMX View' }),
    '2d': t({ id: 'ProjectDetail.tabs.twoDView', defaultMessage: '2D View' }),
    '3d': t({ id: 'ProjectDetail.tabs.threeDView', defaultMessage: '3D View' }),
    console: t({ id: 'ProjectDetail.tabs.virtualConsole', defaultMessage: 'Virtual Console' }),
  };

  return (
    <Tabs value={activeTab} onChange={handleTabChange} className={classes.root} h="100%">
      <Tabs.List>
        {PROJECT_DETAIL_TABS.map(tabValue => (
          <Tabs.Tab key={tabValue} value={tabValue}>
            {tabLabels[tabValue]}
          </Tabs.Tab>
        ))}
      </Tabs.List>

      <Tabs.Panel value="fixtures" pt="md">
        <ProjectFixtureTable projectPublicId={projectPublicId} />
      </Tabs.Panel>

      <Tabs.Panel value="universe" pt="md">
        <UniverseView projectPublicId={projectPublicId} />
      </Tabs.Panel>

      <Tabs.Panel value="dmx" pt="md">
        <DmxView projectPublicId={projectPublicId} />
      </Tabs.Panel>

      <Tabs.Panel value="2d" pt="md">
        <ProjectTabEmptyState
          message={t({ id: 'ProjectDetail.emptyView', defaultMessage: 'This view is not available yet.' })}
        />
      </Tabs.Panel>

      <Tabs.Panel value="3d" pt="md" keepMounted={false} className={classes.threeDPanel}>
        <ThreeDView projectPublicId={projectPublicId} />
      </Tabs.Panel>

      <Tabs.Panel value="console" pt="md" keepMounted={false} className={classes.threeDPanel}>
        <VirtualConsoleView projectPublicId={projectPublicId} />
      </Tabs.Panel>
    </Tabs>
  );
};

export default ProjectDetailTabs;
