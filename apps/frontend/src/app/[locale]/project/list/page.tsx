'use client';

import { useTranslation } from '@/lib/i18n/use-translation';
import { Flex, Title } from '@mantine/core';
import ProjectListToolbar from '../_components/project-list-toolbar';
import ProjectTable from '../_components/project-table';

const ProjectListPage = () => {
  const { t } = useTranslation();

  return (
    <>
      <Flex direction="row" justify="space-between" align="center" mb="md">
        <Title order={1}>{t({ id: 'ProjectList.title', defaultMessage: 'Project list' })}</Title>
        <ProjectListToolbar />
      </Flex>
      <ProjectTable />
    </>
  );
};

export default ProjectListPage;
