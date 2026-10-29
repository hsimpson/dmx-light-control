'use client';
import { ICON_SIZE } from '@/lib/constants';
import { globalMessages } from '@/lib/i18n/global-messages';
import { useTranslation } from '@/lib/i18n/use-translation';
import {
  AddMidiMappingEntryDocument,
  DeleteMidiMappingEntryDocument,
  GetMidiMappingDocument,
  UpdateMidiMappingDocument,
  UpdateMidiMappingEntryDocument,
  type MidiMappingEntryFieldsFragment,
  type MidiMappingFieldsFragment,
} from '@/shared/types/graphql/graphql';
import { useMutation } from '@apollo/client/react';
import { ActionIcon, Button, Group, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { PencilSimpleIcon, PlusCircleIcon, TrashIcon } from '@phosphor-icons/react';
import { DataTable } from 'mantine-datatable';
import { useState } from 'react';
import MidiMappingEntryModal from './midi-mapping-entry-modal';
import { midiAddress, type MidiMappingEntryInput } from './midi-mapping-entry-values';

type MidiMappingEditorProperties = {
  mapping: MidiMappingFieldsFragment;
};

type EntryModalState = { entry: MidiMappingEntryFieldsFragment | undefined } | null;

const MidiMappingEditor = ({ mapping }: MidiMappingEditorProperties) => {
  const { t } = useTranslation();
  const [name, setName] = useState(mapping.name);
  const [entryModal, setEntryModal] = useState<EntryModalState>(null);
  const refetchQueries = [{ query: GetMidiMappingDocument, variables: { publicId: mapping.publicId } }];
  const [updateMapping, { loading: renaming }] = useMutation(UpdateMidiMappingDocument);
  const [addEntry, { loading: adding }] = useMutation(AddMidiMappingEntryDocument, { refetchQueries });
  const [updateEntry, { loading: updating }] = useMutation(UpdateMidiMappingEntryDocument);
  const [deleteEntry] = useMutation(DeleteMidiMappingEntryDocument, { refetchQueries });

  const showError = (message: string) => {
    notifications.show({ color: 'red', title: t(globalMessages.error), message });
  };

  const handleRename = async () => {
    try {
      await updateMapping({ variables: { input: { publicId: mapping.publicId, name: name.trim() } } });
    } catch {
      showError(t({ id: 'MidiMappingDetail.renameError', defaultMessage: 'Failed to rename MIDI mapping' }));
    }
  };

  const handleSubmitEntry = async (input: MidiMappingEntryInput) => {
    const editing = entryModal?.entry;
    try {
      if (editing) {
        await updateEntry({ variables: { input: { publicId: editing.publicId, ...input } } });
      } else {
        await addEntry({ variables: { input: { midiMappingPublicId: mapping.publicId, ...input } } });
      }
      setEntryModal(null);
    } catch {
      showError(
        t({
          id: 'MidiMappingDetail.saveEntryError',
          defaultMessage: 'Failed to save control. Name and MIDI address must be unique.',
        }),
      );
    }
  };

  const handleDeleteEntry = async (entry: MidiMappingEntryFieldsFragment) => {
    try {
      await deleteEntry({ variables: { publicId: entry.publicId } });
    } catch {
      showError(t({ id: 'MidiMappingDetail.deleteEntryError', defaultMessage: 'Failed to delete control' }));
    }
  };

  const nameChanged = name.trim() !== '' && name.trim() !== mapping.name;

  return (
    <>
      <Group align="flex-end" mb="md">
        <TextInput
          label={t({ id: 'MidiMappingDetail.name', defaultMessage: 'Name' })}
          value={name}
          onChange={event => {
            setName(event.currentTarget.value);
          }}
          w={320}
        />
        <Button disabled={!nameChanged} loading={renaming} onClick={() => void handleRename()}>
          {t(globalMessages.save)}
        </Button>
        <Button
          ml="auto"
          rightSection={<PlusCircleIcon size={ICON_SIZE} weight="duotone" />}
          onClick={() => {
            setEntryModal({ entry: undefined });
          }}
        >
          {t({ id: 'MidiMappingEntry.add', defaultMessage: 'Add control' })}
        </Button>
      </Group>
      <DataTable
        withTableBorder
        borderRadius="sm"
        withColumnBorders
        striped
        highlightOnHover
        idAccessor="publicId"
        records={mapping.entries}
        noRecordsText={t({ id: 'MidiMappingDetail.noEntries', defaultMessage: 'No controls yet' })}
        columns={[
          { accessor: 'name', title: t({ id: 'MidiMappingEntry.name', defaultMessage: 'Name' }) },
          { accessor: 'controlType', title: t({ id: 'MidiMappingEntry.controlType', defaultMessage: 'Type' }) },
          {
            accessor: 'address',
            title: t({ id: 'MidiMappingDetail.address', defaultMessage: 'MIDI address' }),
            render: midiAddress,
          },
          {
            accessor: 'feedback',
            title: t({ id: 'MidiMappingEntry.hasFeedback', defaultMessage: 'LED feedback' }),
            render: ({ feedback }) =>
              feedback
                ? `${feedback.off.behavior}/${feedback.off.color} → ${feedback.on.behavior}/${feedback.on.color}`
                : '–',
          },
          {
            accessor: 'actions',
            title: '',
            textAlign: 'right',
            render: entry => (
              <Group gap={4} justify="right" wrap="nowrap">
                <ActionIcon
                  aria-label={t({ id: 'MidiMappingEntry.edit', defaultMessage: 'Edit control' })}
                  onClick={() => {
                    setEntryModal({ entry });
                  }}
                >
                  <PencilSimpleIcon size={ICON_SIZE} weight="duotone" />
                </ActionIcon>
                <ActionIcon
                  aria-label={t({ id: 'MidiMappingEntry.delete', defaultMessage: 'Delete control' })}
                  onClick={() => void handleDeleteEntry(entry)}
                >
                  <TrashIcon size={ICON_SIZE} weight="fill" />
                </ActionIcon>
              </Group>
            ),
          },
        ]}
      />
      {entryModal ? (
        <MidiMappingEntryModal
          entry={entryModal.entry}
          saving={adding || updating}
          onClose={() => {
            setEntryModal(null);
          }}
          onSubmit={input => void handleSubmitEntry(input)}
        />
      ) : null}
    </>
  );
};

export default MidiMappingEditor;
