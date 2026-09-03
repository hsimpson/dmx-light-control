'use client';

import { useTranslation } from '@/lib/i18n/use-translation';
import { Tabs } from '@mantine/core';
import classes from './project-detail-tabs.module.css';
import ProjectFixtureTable from './project-fixture-table';
import ProjectTabEmptyState from './project-tab-empty-state';
import ThreeDView from './three-d-view';
import UniverseView from './universe-view';

type ProjectDetailTabsProperties = {
  projectPublicId: string;
};

const ProjectDetailTabs = ({ projectPublicId }: ProjectDetailTabsProperties) => {
  const { t } = useTranslation();

  return (
    <Tabs defaultValue="fixtures" className={classes.root}>
      <Tabs.List>
        <Tabs.Tab value="fixtures">{t({ id: 'ProjectDetail.tabs.fixtures', defaultMessage: 'Fixtures' })}</Tabs.Tab>
        <Tabs.Tab value="universe">
          {t({ id: 'ProjectDetail.tabs.universeView', defaultMessage: 'Universe View' })}
        </Tabs.Tab>
        <Tabs.Tab value="dmx">{t({ id: 'ProjectDetail.tabs.dmxView', defaultMessage: 'DMX View' })}</Tabs.Tab>
        <Tabs.Tab value="2d">{t({ id: 'ProjectDetail.tabs.twoDView', defaultMessage: '2D View' })}</Tabs.Tab>
        <Tabs.Tab value="3d">{t({ id: 'ProjectDetail.tabs.threeDView', defaultMessage: '3D View' })}</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="fixtures" pt="md">
        <ProjectFixtureTable projectPublicId={projectPublicId} />
      </Tabs.Panel>

      <Tabs.Panel value="universe" pt="md">
        <UniverseView projectPublicId={projectPublicId} />
      </Tabs.Panel>

      <Tabs.Panel value="dmx" pt="md">
        <ProjectTabEmptyState
          message={t({ id: 'ProjectDetail.emptyView', defaultMessage: 'This view is not available yet.' })}
        />
      </Tabs.Panel>

      <Tabs.Panel value="2d" pt="md">
        <ProjectTabEmptyState
          message={t({ id: 'ProjectDetail.emptyView', defaultMessage: 'This view is not available yet.' })}
        />
      </Tabs.Panel>

      <Tabs.Panel value="3d" pt="md" keepMounted={false} className={classes.threeDPanel}>
        <ThreeDView projectPublicId={projectPublicId} />
      </Tabs.Panel>
    </Tabs>
  );
};

export default ProjectDetailTabs;
