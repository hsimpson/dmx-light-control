'use client';

import { ICON_SIZE } from '@/lib/constants';
import { useTranslation } from '@/lib/i18n/use-translation';
import { GetFixturesDocument } from '@/shared/types/graphql/graphql';
import { useQuery } from '@apollo/client/react';
import { Button, Flex } from '@mantine/core';
import { PlusCircleIcon } from '@phosphor-icons/react';
import { DataTable } from 'mantine-datatable';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const FixtureListPage = () => {
  const { t } = useTranslation();
  const { data, loading } = useQuery(GetFixturesDocument);
  const router = useRouter();

  const fixtures = data?.fixtures ?? [];

  return (
    <>
      <Flex direction="row" justify="space-between" align="center" mb="md">
        <p>{t({ id: 'FixtureList.title', defaultMessage: 'Fixture list' })}</p>
        <Button
          component={Link}
          rightSection={<PlusCircleIcon size={ICON_SIZE} weight="duotone" />}
          href="/fixture/new"
        >
          {t({ id: 'FixtureList.add', defaultMessage: 'Add Fixture' })}
        </Button>
      </Flex>
      <DataTable
        withTableBorder
        borderRadius="sm"
        withColumnBorders
        striped
        highlightOnHover
        idAccessor="externalId"
        records={fixtures}
        fetching={loading}
        columns={[
          {
            accessor: 'vendor.name',
            title: t({
              id: 'FixtureList.Table.vendor',
              defaultMessage: 'Vendor',
            }),
          },
          {
            accessor: 'name',
            title: t({
              id: 'FixtureList.Table.name',
              defaultMessage: 'Name',
            }),
          },
          {
            accessor: 'channelAssignments',
            title: t({
              id: 'FixtureList.Table.channelsModes',
              defaultMessage: 'Channel modes',
            }),
            render: ({ channelAssignments }) => {
              const modes = channelAssignments.map((ca) => ca.channelMode);
              const set = new Set(modes);
              return Array.from(set).sort().join(', ');
            },
          },
        ]}
        onRowClick={(record) => {
          router.push(`/fixture/${record.record.externalId}`);
        }}
      />
    </>
  );
};

export default FixtureListPage;
