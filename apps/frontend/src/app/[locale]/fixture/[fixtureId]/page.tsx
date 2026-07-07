'use client';

import { Loading } from '@/components/loading';
import { useTranslation } from '@/lib/i18n/use-translation';
import { GetFixtureDocument, GetFixtureVendorsDocument } from '@/shared/types/graphql/graphql';
import { useQuery } from '@apollo/client/react';
import { Title } from '@mantine/core';
import { useParams } from 'next/navigation';
import FixtureForm from '../_components/fixture-form';

const EditFixturePage = () => {
  const { t } = useTranslation();
  const { fixtureId } = useParams<{ fixtureId: string }>();

  const { data: fixtureData, loading: fixtureLoading } = useQuery(GetFixtureDocument, {
    variables: { fixtureId },
    skip: !fixtureId,
  });

  const { data: vendorsData, loading: vendorsLoading } = useQuery(GetFixtureVendorsDocument);

  if (fixtureLoading || vendorsLoading) {
    return <Loading />;
  }

  return (
    <>
      <Title order={1}>{t({ id: 'EditFixturePage.title', defaultMessage: 'Edit Fixture' })}</Title>
      <FixtureForm fixture={fixtureData?.fixture ?? undefined} vendors={vendorsData?.fixtureVendors ?? []} />
    </>
  );
};

export default EditFixturePage;
