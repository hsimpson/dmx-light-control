'use client';

import { Loading } from '@/components/loading';
import { useTranslation } from '@/lib/i18n/use-translation';
import { GetFixturesDocument } from '@/shared/types/graphql/graphql';
import { useQuery } from '@apollo/client/react';
import { DataTable } from 'mantine-datatable';
import { useRouter } from 'next/navigation';

const FixtureTable = () => {
  const { t } = useTranslation();
  const { data, loading } = useQuery(GetFixturesDocument);
  const router = useRouter();

  if (loading) {
    return <Loading />;
  }

  const fixtures = data?.fixtures ?? [];

  return (
    <DataTable
      withTableBorder
      borderRadius="sm"
      withColumnBorders
      striped
      highlightOnHover
      idAccessor="publicId"
      records={fixtures}
      fetching={loading}
      columns={[
        {
          accessor: 'fixtureVendor.name',
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
          accessor: 'fixtureChannelModes',
          title: t({
            id: 'FixtureList.Table.channelsModes',
            defaultMessage: 'Channel modes',
          }),
          render: ({ fixtureChannelModes }) => {
            const modes = fixtureChannelModes.map(cm => cm.name);
            return modes.sort().join(', ');
          },
        },
      ]}
      onRowClick={record => {
        router.push(`/fixture/${record.record.publicId}`);
      }}
    />
  );
};

export default FixtureTable;
