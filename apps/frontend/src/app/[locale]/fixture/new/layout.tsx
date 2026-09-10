'use client';

import { Loading } from '@/components/loading';
import { GetFixtureVendorsDocument } from '@/shared/types/graphql/graphql';
import { useQuery } from '@apollo/client/react';
import { Box } from '@mantine/core';
import type { ReactNode } from 'react';
import FixtureForm from '../_components/fixture-form';

type AddFixtureLayoutProperties = {
  children: ReactNode;
};

const AddFixtureLayout = ({ children }: AddFixtureLayoutProperties) => {
  const { data: vendorsData, loading: vendorsLoading } = useQuery(GetFixtureVendorsDocument);

  if (vendorsLoading) {
    return <Loading />;
  }

  return (
    <Box
      flex={1}
      display="flex"
      mih="calc(100dvh - var(--app-shell-header-height, 60px) - 2 * var(--mantine-spacing-md))"
      style={{ flexDirection: 'column' }}
    >
      <FixtureForm vendors={vendorsData?.fixtureVendors ?? []} />
      {children}
    </Box>
  );
};

export default AddFixtureLayout;
