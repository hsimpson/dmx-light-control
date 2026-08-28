'use client';

import { DateTime } from '@/components/date-time';
import { Loading } from '@/components/loading';
import { ICON_SIZE } from '@/lib/constants';
import { globalMessages } from '@/lib/i18n/global-messages';
import { useTranslation } from '@/lib/i18n/use-translation';
import { orderSorter } from '@/shared/sorter';
import { Fixture } from '@/shared/types/fixtures';
import { DeleteFixtureDocument, GetFixturesDocument } from '@/shared/types/graphql/graphql';
import { useMutation, useQuery } from '@apollo/client/react';
import { ActionIcon, Button, Group, Modal } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { TrashIcon } from '@phosphor-icons/react';
import { DataTable, type DataTableSortStatus } from 'mantine-datatable';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

const DEFAULT_SORT_STATUS: DataTableSortStatus<Fixture> = {
  columnAccessor: 'fixtureVendor.name',
  direction: 'asc',
};

const getFixtureSortValue = (fixture: Fixture, columnAccessor: string): string | number => {
  switch (columnAccessor) {
    case 'fixtureVendor.name':
      return fixture.fixtureVendor.name;
    case 'name':
      return fixture.name;
    case 'fixtureChannelModes':
      return [...fixture.fixtureChannelModes]
        .sort(orderSorter)
        .map(channelMode => channelMode.name)
        .join(', ');
    case 'createdAt':
      return new Date(fixture.createdAt).getTime();
    case 'updatedAt':
      return new Date(fixture.updatedAt).getTime();
    default:
      return '';
  }
};

const compareFixtures = (a: Fixture, b: Fixture, sortStatus: DataTableSortStatus<Fixture>): number => {
  const aValue = getFixtureSortValue(a, sortStatus.columnAccessor);
  const bValue = getFixtureSortValue(b, sortStatus.columnAccessor);
  const comparison =
    typeof aValue === 'number' && typeof bValue === 'number'
      ? aValue - bValue
      : String(aValue).localeCompare(String(bValue), undefined, { sensitivity: 'base' });

  return sortStatus.direction === 'desc' ? -comparison : comparison;
};

const FixtureTable = () => {
  const { t } = useTranslation();
  const { data, loading } = useQuery(GetFixturesDocument);
  const [deleteFixture, { loading: deleting }] = useMutation(DeleteFixtureDocument);
  const router = useRouter();
  const [fixtureToDelete, setFixtureToDelete] = useState<Fixture | null>(null);
  const [confirmOpened, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<Fixture>>(DEFAULT_SORT_STATUS);
  const fixtures = useMemo(
    () => [...(data?.fixtures ?? [])].sort((a, b) => compareFixtures(a, b, sortStatus)),
    [data?.fixtures, sortStatus],
  );

  if (loading) {
    return <Loading />;
  }

  const handleDeleteClick = (fixture: Fixture) => {
    setFixtureToDelete(fixture);
    openConfirm();
  };

  const handleConfirmDelete = async () => {
    if (!fixtureToDelete) {
      return;
    }

    try {
      const { data: result } = await deleteFixture({
        variables: { publicId: fixtureToDelete.publicId },
        update: cache => {
          cache.evict({ id: cache.identify({ __typename: 'FixtureDto', publicId: fixtureToDelete.publicId }) });
          cache.gc();
        },
      });

      if (result?.deleteFixture.deleted) {
        notifications.show({
          color: 'green',
          title: t({ id: 'FixtureList.deleted', defaultMessage: 'Fixture deleted' }),
          message: fixtureToDelete.name,
        });
      }
    } catch {
      notifications.show({
        color: 'red',
        title: t(globalMessages.error),
        message: t({ id: 'FixtureList.deleteError', defaultMessage: 'Failed to delete fixture' }),
      });
    } finally {
      closeConfirm();
      setFixtureToDelete(null);
    }
  };

  return (
    <>
      <DataTable
        withTableBorder
        borderRadius="sm"
        withColumnBorders
        striped
        highlightOnHover
        idAccessor="publicId"
        records={fixtures}
        fetching={loading}
        sortStatus={sortStatus}
        onSortStatusChange={setSortStatus}
        columns={[
          {
            accessor: 'fixtureVendor.name',
            sortable: true,
            title: t({
              id: 'FixtureList.Table.vendor',
              defaultMessage: 'Vendor',
            }),
          },
          {
            accessor: 'name',
            sortable: true,
            title: t({
              id: 'FixtureList.Table.name',
              defaultMessage: 'Name',
            }),
          },
          {
            accessor: 'fixtureChannelModes',
            sortable: true,
            title: t({
              id: 'FixtureList.Table.channelsModes',
              defaultMessage: 'Channel modes',
            }),
            render: ({ fixtureChannelModes }) => {
              return [...fixtureChannelModes]
                .sort(orderSorter)
                .map(cm => cm.name)
                .join(', ');
            },
          },
          {
            accessor: 'createdAt',
            sortable: true,
            title: t(globalMessages.createdAt),
            render: fixture => <DateTime date={fixture.createdAt} />,
          },
          {
            accessor: 'updatedAt',
            sortable: true,
            title: t(globalMessages.updatedAt),
            render: fixture => <DateTime date={fixture.updatedAt} />,
          },
          {
            accessor: 'actions',
            title: '',
            textAlign: 'right',
            render: fixture => {
              return (
                <Group gap={4} justify="right" wrap="nowrap">
                  <ActionIcon
                    aria-label={t({ id: 'FixtureList.delete', defaultMessage: 'Delete fixture' })}
                    onClick={event => {
                      event.stopPropagation();
                      handleDeleteClick(fixture);
                    }}
                  >
                    <TrashIcon size={ICON_SIZE} weight="fill" />
                  </ActionIcon>
                </Group>
              );
            },
          },
        ]}
        onRowClick={record => {
          router.push(`/fixture/${record.record.publicId}`);
        }}
      />
      <Modal
        opened={confirmOpened}
        onClose={closeConfirm}
        title={t({ id: 'FixtureList.confirmDelete', defaultMessage: 'Delete fixture?' })}
        centered
      >
        <Group justify="space-between">
          <Button variant="default" onClick={closeConfirm}>
            {t(globalMessages.cancel)}
          </Button>
          <Button color="red" loading={deleting} onClick={() => void handleConfirmDelete()}>
            {t({ id: 'FixtureList.delete', defaultMessage: 'Delete fixture' })}
          </Button>
        </Group>
      </Modal>
    </>
  );
};

export default FixtureTable;
