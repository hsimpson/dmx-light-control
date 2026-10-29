'use client';
import { DateTime } from '@/components/date-time';
import { Loading } from '@/components/loading';
import { ICON_SIZE } from '@/lib/constants';
import { globalMessages } from '@/lib/i18n/global-messages';
import { useTranslation } from '@/lib/i18n/use-translation';
import {
  CreateMidiMappingDocument,
  DeleteMidiMappingDocument,
  GetMidiMappingsDocument,
  type MidiMappingFieldsFragment,
} from '@/shared/types/graphql/graphql';
import { useMutation, useQuery } from '@apollo/client/react';
import { ActionIcon, Button, Group, Modal, TextInput } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { PlusCircleIcon, TrashIcon } from '@phosphor-icons/react';
import { DataTable } from 'mantine-datatable';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const MidiMappingTable = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, loading } = useQuery(GetMidiMappingsDocument);
  const [deleteMidiMapping, { loading: deleting }] = useMutation(DeleteMidiMappingDocument);
  const [createMidiMapping, { loading: creating }] = useMutation(CreateMidiMappingDocument, {
    refetchQueries: [GetMidiMappingsDocument],
  });
  const [mappingToDelete, setMappingToDelete] = useState<MidiMappingFieldsFragment | null>(null);
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [newName, setNewName] = useState('');

  if (loading) {
    return <Loading />;
  }

  const handleConfirmDelete = async () => {
    if (!mappingToDelete) {
      return;
    }
    try {
      await deleteMidiMapping({
        variables: { publicId: mappingToDelete.publicId },
        update: cache => {
          cache.evict({ id: cache.identify({ __typename: 'MidiMappingDto', publicId: mappingToDelete.publicId }) });
        },
      });
      notifications.show({
        color: 'green',
        title: t({ id: 'MidiMappingList.deleted', defaultMessage: 'MIDI mapping deleted' }),
        message: mappingToDelete.name,
      });
    } catch {
      notifications.show({
        color: 'red',
        title: t(globalMessages.error),
        message: t({ id: 'MidiMappingList.deleteError', defaultMessage: 'Failed to delete MIDI mapping' }),
      });
    } finally {
      setMappingToDelete(null);
    }
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      return;
    }
    try {
      const { data: result } = await createMidiMapping({ variables: { name } });
      setNewName('');
      closeCreate();
      if (result?.createMidiMapping) {
        router.push(`/midiMapping/${result.createMidiMapping.publicId}`);
      }
    } catch {
      notifications.show({
        color: 'red',
        title: t(globalMessages.error),
        message: t({ id: 'MidiMappingList.createError', defaultMessage: 'Failed to create MIDI mapping' }),
      });
    }
  };

  return (
    <>
      <Group justify="flex-end" mb="md">
        <Button rightSection={<PlusCircleIcon size={ICON_SIZE} weight="duotone" />} onClick={openCreate}>
          {t({ id: 'MidiMappingList.create', defaultMessage: 'Add MIDI mapping' })}
        </Button>
      </Group>
      <DataTable
        withTableBorder
        borderRadius="sm"
        withColumnBorders
        striped
        highlightOnHover
        idAccessor="publicId"
        records={data?.midiMappings ?? []}
        onRowClick={({ record }) => {
          router.push(`/midiMapping/${record.publicId}`);
        }}
        columns={[
          { accessor: 'name', title: t({ id: 'MidiMappingList.Table.name', defaultMessage: 'Name' }) },
          {
            accessor: 'entries',
            title: t({ id: 'MidiMappingList.Table.entries', defaultMessage: 'Controls' }),
            render: mapping => mapping.entries.length,
          },
          {
            accessor: 'createdAt',
            title: t(globalMessages.createdAt),
            render: mapping => <DateTime date={mapping.createdAt} />,
          },
          {
            accessor: 'updatedAt',
            title: t(globalMessages.updatedAt),
            render: mapping => <DateTime date={mapping.updatedAt} />,
          },
          {
            accessor: 'actions',
            title: '',
            textAlign: 'right',
            render: mapping => (
              <ActionIcon
                aria-label={t({ id: 'MidiMappingList.delete', defaultMessage: 'Delete MIDI mapping' })}
                onClick={event => {
                  event.stopPropagation();
                  setMappingToDelete(mapping);
                }}
              >
                <TrashIcon size={ICON_SIZE} weight="fill" />
              </ActionIcon>
            ),
          },
        ]}
      />
      <Modal
        opened={mappingToDelete !== null}
        onClose={() => {
          setMappingToDelete(null);
        }}
        title={t({ id: 'MidiMappingList.confirmDelete', defaultMessage: 'Delete MIDI mapping?' })}
        centered
      >
        <Group justify="space-between">
          <Button
            variant="default"
            onClick={() => {
              setMappingToDelete(null);
            }}
          >
            {t(globalMessages.cancel)}
          </Button>
          <Button color="red" loading={deleting} onClick={() => void handleConfirmDelete()}>
            {t({ id: 'MidiMappingList.delete', defaultMessage: 'Delete MIDI mapping' })}
          </Button>
        </Group>
      </Modal>
      <Modal
        opened={createOpened}
        onClose={closeCreate}
        title={t({ id: 'MidiMappingList.create', defaultMessage: 'Add MIDI mapping' })}
        centered
      >
        <TextInput
          data-autofocus
          label={t({ id: 'MidiMappingList.name', defaultMessage: 'Name' })}
          placeholder="APC mini mk2"
          value={newName}
          onChange={event => {
            setNewName(event.currentTarget.value);
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
            {t({ id: 'MidiMappingList.create', defaultMessage: 'Add MIDI mapping' })}
          </Button>
        </Group>
      </Modal>
    </>
  );
};

export default MidiMappingTable;
