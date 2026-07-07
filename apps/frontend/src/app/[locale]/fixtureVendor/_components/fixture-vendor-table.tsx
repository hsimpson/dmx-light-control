'use client';
import { DateTime } from '@/components/date-time';
import { Loading } from '@/components/loading';
import { ICON_SIZE } from '@/lib/constants';
import { globalMessages } from '@/lib/i18n/global-messages';
import { useTranslation } from '@/lib/i18n/use-translation';
import { FixtureVendor } from '@/shared/types/fixtures';
import { GetFixtureVendorsDocument } from '@/shared/types/graphql/graphql';
import { useQuery } from '@apollo/client/react';
import { ActionIcon, Group } from '@mantine/core';
import { TrashIcon } from '@phosphor-icons/react';
import { DataTable } from 'mantine-datatable';

const FixtureVendorTable = () => {
  const { t } = useTranslation();
  const { data, loading } = useQuery(GetFixtureVendorsDocument);

  if (loading) {
    return <Loading />;
  }

  const handleDelete = (_fixtureToDelete: FixtureVendor) => {
    //
  };

  const fixtureVendors = data?.fixtureVendors ?? [];

  return (
    <DataTable
      withTableBorder
      borderRadius="sm"
      withColumnBorders
      striped
      highlightOnHover
      idAccessor="publicId"
      records={fixtureVendors}
      fetching={loading}
      columns={[
        {
          accessor: 'name',
          title: t({
            id: 'FixtureVendorList.Table.name',
            defaultMessage: 'Name',
          }),
        },
        {
          accessor: 'createdAt',
          title: t(globalMessages.createdAt),
          render: fixtureVendor => <DateTime date={fixtureVendor.createdAt} />,
        },
        {
          accessor: 'updatedAt',
          title: t(globalMessages.updatedAt),
          render: fixtureVendor => <DateTime date={fixtureVendor.updatedAt} />,
        },
        {
          accessor: 'actions',
          title: '',
          textAlign: 'right',
          render: fixtureVendor => {
            return (
              <Group gap={4} justify="right" wrap="nowrap">
                <ActionIcon
                  onClick={event => {
                    event.stopPropagation();
                    handleDelete(fixtureVendor);
                  }}
                >
                  <TrashIcon size={ICON_SIZE} weight="fill" />
                </ActionIcon>
              </Group>
            );
          },
        },
      ]}
    />
  );
};

export default FixtureVendorTable;
