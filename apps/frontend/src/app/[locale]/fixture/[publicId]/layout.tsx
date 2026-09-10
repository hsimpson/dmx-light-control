'use client';

import { Loading } from '@/components/loading';
import { useTranslation } from '@/lib/i18n/use-translation';
import { GetFixtureDocument, GetFixtureVendorsDocument } from '@/shared/types/graphql/graphql';
import { useQuery } from '@apollo/client/react';
import { Box, Text } from '@mantine/core';
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
    <Box
      flex={1}
      display="flex"
      mih="calc(100dvh - var(--app-shell-header-height, 60px) - 2 * var(--mantine-spacing-md))"
      style={{ flexDirection: 'column' }}
    >
      <FixtureForm fixture={fixture} vendors={vendorsData?.fixtureVendors ?? []} />
      {children}
    </Box>
  );
};

export default FixtureDetailLayout;
