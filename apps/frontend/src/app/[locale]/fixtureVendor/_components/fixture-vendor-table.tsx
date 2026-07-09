'use client';
import { DateTime } from '@/components/date-time';
import { Loading } from '@/components/loading';
import { ICON_SIZE } from '@/lib/constants';
import { globalMessages } from '@/lib/i18n/global-messages';
import { useTranslation } from '@/lib/i18n/use-translation';
import { FixtureVendor } from '@/shared/types/fixtures';
import {
  CreateFixtureVendorDocument,
  DeleteFixtureVendorDocument,
  GetFixtureVendorsDocument,
} from '@/shared/types/graphql/graphql';
import { useMutation, useQuery } from '@apollo/client/react';
import { ActionIcon, Button, Group, Modal, TextInput } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { PlusCircleIcon, TrashIcon } from '@phosphor-icons/react';
import { DataTable } from 'mantine-datatable';
import { useState } from 'react';

const FixtureVendorTable = () => {
  const { t } = useTranslation();
  const { data, loading } = useQuery(GetFixtureVendorsDocument);
  const [deleteFixtureVendor, { loading: deleting }] = useMutation(DeleteFixtureVendorDocument);
  const [createFixtureVendor, { loading: creating }] = useMutation(CreateFixtureVendorDocument);
  const [fixtureToDelete, setFixtureToDelete] = useState<FixtureVendor | null>(null);
  const [confirmOpened, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [newVendorName, setNewVendorName] = useState('');

  if (loading) {
    return <Loading />;
  }

  const handleDeleteClick = (fixtureVendor: FixtureVendor) => {
    setFixtureToDelete(fixtureVendor);
    openConfirm();
  };

  const handleConfirmDelete = async () => {
    if (!fixtureToDelete) {
      return;
    }

    try {
      const { data: result } = await deleteFixtureVendor({
        variables: { publicId: fixtureToDelete.publicId },
        update: cache => {
          cache.evict({ id: cache.identify({ __typename: 'FixtureVendorDto', publicId: fixtureToDelete.publicId }) });
        },
      });

      if (result?.deleteFixtureVendor.deleted) {
        notifications.show({
          color: 'green',
          title: t({ id: 'FixtureVendorList.deleted', defaultMessage: 'Vendor deleted' }),
          message: fixtureToDelete.name,
        });
      }
    } catch {
      notifications.show({
        color: 'red',
        title: t(globalMessages.error),
        message: t({ id: 'FixtureVendorList.deleteError', defaultMessage: 'Failed to delete vendor' }),
      });
    } finally {
      closeConfirm();
      setFixtureToDelete(null);
    }
  };

  const handleCreate = async () => {
    const name = newVendorName.trim();
    if (!name) {
      return;
    }

    try {
      await createFixtureVendor({
        variables: { name },
        update: (cache, { data: result }) => {
          const created = result?.createFixtureVendor;
          if (!created) {
            return;
          }
          cache.updateQuery({ query: GetFixtureVendorsDocument }, existing => ({
            fixtureVendors: [...(existing?.fixtureVendors ?? []), created],
          }));
        },
      });

      notifications.show({
        color: 'green',
        title: t({ id: 'FixtureVendorList.created', defaultMessage: 'Vendor created' }),
        message: name,
      });
      setNewVendorName('');
    } catch {
      notifications.show({
        color: 'red',
        title: t(globalMessages.error),
        message: t({ id: 'FixtureVendorList.createError', defaultMessage: 'Failed to create vendor' }),
      });
    } finally {
      closeCreate();
    }
  };

  const fixtureVendors = data?.fixtureVendors ?? [];

  return (
    <>
      <Group justify="flex-end" mb="md">
        <Button rightSection={<PlusCircleIcon size={ICON_SIZE} weight="duotone" />} onClick={openCreate}>
          {t({ id: 'FixtureVendorList.create', defaultMessage: 'Add vendor' })}
        </Button>
      </Group>
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
                      handleDeleteClick(fixtureVendor);
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
      <Modal
        opened={confirmOpened}
        onClose={closeConfirm}
        title={t({ id: 'FixtureVendorList.confirmDelete', defaultMessage: 'Delete vendor?' })}
        centered
      >
        <Group justify="space-between">
          <Button variant="default" onClick={closeConfirm}>
            {t(globalMessages.cancel)}
          </Button>
          <Button color="red" loading={deleting} onClick={() => void handleConfirmDelete()}>
            {t({ id: 'FixtureVendorList.confirmDelete', defaultMessage: 'Delete vendor' })}
          </Button>
        </Group>
      </Modal>
      <Modal
        opened={createOpened}
        onClose={closeCreate}
        title={t({ id: 'FixtureVendorList.create', defaultMessage: 'Add vendor' })}
        centered
      >
        <TextInput
          data-autofocus
          label={t({ id: 'FixtureVendorList.name', defaultMessage: 'Name' })}
          placeholder={t({ id: 'FixtureVendorList.name', defaultMessage: 'Name' })}
          value={newVendorName}
          onChange={event => {
            setNewVendorName(event.currentTarget.value);
          }}
          onKeyDown={event => {
            if (event.key === 'Enter' && !creating) {
              void handleCreate();
            }
          }}
          mb="md"
        />
        <Group justify="space-between">
          <Button variant="default" onClick={closeCreate}>
            {t(globalMessages.cancel)}
          </Button>
          <Button loading={creating} onClick={() => void handleCreate()}>
            {t({ id: 'FixtureVendorList.create', defaultMessage: 'Add vendor' })}
          </Button>
        </Group>
      </Modal>
    </>
  );
};

export default FixtureVendorTable;
