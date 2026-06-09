'use client';

import { ICON_SIZE } from '@/lib/constants';
import { useTranslation } from '@/lib/i18n/use-translation';
import { Button, Flex, Title } from '@mantine/core';
import { PlusCircleIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import FixtureTable from '../_components/fixture-table';

const FixtureListPage = () => {
  const { t } = useTranslation();

  return (
    <>
      <Flex direction="row" justify="space-between" align="center" mb="md">
        <Title order={1}>{t({ id: 'FixtureList.title', defaultMessage: 'Fixture list' })}</Title>
        <Button
          component={Link}
          rightSection={<PlusCircleIcon size={ICON_SIZE} weight="duotone" />}
          href="/fixture/new"
        >
          {t({ id: 'FixtureList.add', defaultMessage: 'Add Fixture' })}
        </Button>
      </Flex>
      <FixtureTable />
    </>
  );
};

export default FixtureListPage;
