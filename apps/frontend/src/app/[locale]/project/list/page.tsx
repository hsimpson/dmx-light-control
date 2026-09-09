'use client';

import { ICON_SIZE } from '@/lib/constants';
import { useTranslation } from '@/lib/i18n/use-translation';
import { Button, Flex, Group, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { PlusCircleIcon } from '@phosphor-icons/react';
import ProjectListToolbar from '../_components/project-list-toolbar';
import ProjectTable from '../_components/project-table';

const ProjectListPage = () => {
  const { t } = useTranslation();
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);

  return (
    <>
      <Flex direction="row" justify="space-between" align="center" mb="md">
        <Title order={1}>{t({ id: 'ProjectList.title', defaultMessage: 'Project list' })}</Title>
        <Group gap="sm">
          <Button rightSection={<PlusCircleIcon size={ICON_SIZE} weight="duotone" />} onClick={openCreate}>
            {t({ id: 'ProjectList.create', defaultMessage: 'Add project' })}
          </Button>
          <ProjectListToolbar />
        </Group>
      </Flex>
      <ProjectTable createOpened={createOpened} onCloseCreate={closeCreate} />
    </>
  );
};

export default ProjectListPage;
