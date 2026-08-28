'use client';

import { Loading } from '@/components/loading';
import { useTranslation } from '@/lib/i18n/use-translation';
import { GetFixtureVendorsDocument } from '@/shared/types/graphql/graphql';
import { useQuery } from '@apollo/client/react';
import { Title } from '@mantine/core';
import FixtureForm from '../_components/fixture-form';

const AddFixturePage = () => {
  const { t } = useTranslation();
  const { data: vendorsData, loading: vendorsLoading } = useQuery(GetFixtureVendorsDocument);

  if (vendorsLoading) {
    return <Loading />;
  }

  return (
    <>
      <Title order={1}>{t({ id: 'AddFixturePage.title', defaultMessage: 'Add Fixture' })}</Title>
      <FixtureForm vendors={vendorsData?.fixtureVendors ?? []} />
    </>
  );
};

export default AddFixturePage;
