'use client';

import { ICON_SIZE } from '@/lib/constants';
import { downloadJsonFile } from '@/lib/download-json-file';
import { importErrorMessage } from '@/lib/graphql/import-error-message';
import { globalMessages } from '@/lib/i18n/global-messages';
import { useTranslation } from '@/lib/i18n/use-translation';
import {
  ExportMidiMappingsDocument,
  GetMidiMappingsDocument,
  ImportMidiMappingsDocument,
  ImportMidiMappingsInput,
} from '@/shared/types/graphql/graphql';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Button, FileButton, Group } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { DownloadSimpleIcon, UploadSimpleIcon } from '@phosphor-icons/react';

const MidiMappingListToolbar = () => {
  const { t } = useTranslation();
  const client = useApolloClient();
  const [importMidiMappings, { loading: importing }] = useMutation(ImportMidiMappingsDocument);

  const handleExport = async () => {
    try {
      const { data } = await client.query({ query: ExportMidiMappingsDocument, fetchPolicy: 'network-only' });
      if (!data) {
        throw new Error('empty export');
      }
      downloadJsonFile('midi-mappings.json', data.exportMidiMappings);
      notifications.show({
        color: 'green',
        title: t({ id: 'MidiMappingList.exported', defaultMessage: 'MIDI mappings exported' }),
        message: t({ id: 'MidiMappingList.title', defaultMessage: 'MIDI mappings' }),
      });
    } catch {
      notifications.show({
        color: 'red',
        title: t(globalMessages.error),
        message: t({ id: 'MidiMappingList.exportError', defaultMessage: 'Failed to export MIDI mappings' }),
      });
    }
  };

  const handleImport = async (file: File | null) => {
    if (!file) {
      return;
    }
    try {
      const document = JSON.parse(await file.text()) as ImportMidiMappingsInput;
      await importMidiMappings({ variables: { document }, refetchQueries: [{ query: GetMidiMappingsDocument }] });
      notifications.show({
        color: 'green',
        title: t({ id: 'MidiMappingList.imported', defaultMessage: 'MIDI mappings imported' }),
        message: file.name,
      });
    } catch (error) {
      notifications.show({
        color: 'red',
        title: t(globalMessages.error),
        message: importErrorMessage(
          error,
          t({ id: 'MidiMappingList.importError', defaultMessage: 'Failed to import MIDI mappings' }),
        ),
      });
    }
  };

  return (
    <Group gap="sm">
      <FileButton accept="application/json,.json" onChange={file => void handleImport(file)}>
        {props => (
          <Button
            {...props}
            variant="default"
            loading={importing}
            rightSection={<UploadSimpleIcon size={ICON_SIZE} weight="duotone" />}
          >
            {t({ id: 'MidiMappingList.import', defaultMessage: 'Import MIDI mappings' })}
          </Button>
        )}
      </FileButton>
      <Button
        variant="default"
        onClick={() => void handleExport()}
        rightSection={<DownloadSimpleIcon size={ICON_SIZE} weight="duotone" />}
      >
        {t({ id: 'MidiMappingList.export', defaultMessage: 'Export MIDI mappings' })}
      </Button>
    </Group>
  );
};

export default MidiMappingListToolbar;
