'use client';

import { useTranslation } from '@/lib/i18n/use-translation';
import { Flex, Title } from '@mantine/core';
import FixtureVendorTable from '../_components/fixture-vendor-table';

const FixtureVendorListPage = () => {
  const { t } = useTranslation();

  return (
    <>
      <Flex direction="row" justify="space-between" align="center" mb="md">
        <Title order={1}>{t({ id: 'FixtureVendorList.title', defaultMessage: 'Fixture vendor list' })}</Title>
      </Flex>
      <FixtureVendorTable />
    </>
  );
};

export default FixtureVendorListPage;
