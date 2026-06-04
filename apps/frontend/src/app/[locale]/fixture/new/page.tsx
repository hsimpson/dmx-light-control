'use client';

import { Loading } from '@/components/loading';
import { useTranslation } from '@/lib/i18n/use-translation';
import { GetVendorsDocument } from '@/shared/types/graphql/graphql';
import { useQuery } from '@apollo/client/react';
import { Title } from '@mantine/core';
import FixtureForm from '../_components/fixture-form';

export const AddFixturePage = () => {
  const { t } = useTranslation();
  const { data: vendorsData, loading: vendorsLoading } = useQuery(GetVendorsDocument);

  if (vendorsLoading) {
    return <Loading />;
  }

  return (
    <>
      <Title order={1}>{t({ id: 'AddFixturePage.title', defaultMessage: 'Add Fixture' })}</Title>
      <FixtureForm vendors={vendorsData?.vendors ?? []} />
    </>
  );
};

export default AddFixturePage;
