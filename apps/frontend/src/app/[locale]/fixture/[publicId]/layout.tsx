'use client';

import { Loading } from '@/components/loading';
import { useTranslation } from '@/lib/i18n/use-translation';
import { GetFixtureDocument, GetFixtureVendorsDocument } from '@/shared/types/graphql/graphql';
import { useQuery } from '@apollo/client/react';
import { Box, Text, Title } from '@mantine/core';
import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import FixtureForm from '../_components/fixture-form';

type FixtureDetailLayoutProperties = {
  children: ReactNode;
};

const FixtureDetailLayout = ({ children }: FixtureDetailLayoutProperties) => {
  const { t } = useTranslation();
  const { publicId } = useParams<{ publicId: string }>();

  const { data: fixtureData, loading: fixtureLoading } = useQuery(GetFixtureDocument, {
    variables: { publicId },
    skip: !publicId,
  });

  const { data: vendorsData, loading: vendorsLoading } = useQuery(GetFixtureVendorsDocument);

  if (fixtureLoading || vendorsLoading) {
    return <Loading />;
  }

  const fixture = fixtureData?.fixture;
  if (!fixture) {
    return <Text>{t({ id: 'FixtureDetail.notFound', defaultMessage: 'Fixture not found' })}</Text>;
  }

  return (
    <Box flex={1} mih={0} display="flex" style={{ flexDirection: 'column' }}>
      <Title order={1}>{t({ id: 'EditFixturePage.title', defaultMessage: 'Edit Fixture' })}</Title>
      <FixtureForm fixture={fixture} vendors={vendorsData?.fixtureVendors ?? []} showTabs />
      {children}
    </Box>
  );
};

export default FixtureDetailLayout;
