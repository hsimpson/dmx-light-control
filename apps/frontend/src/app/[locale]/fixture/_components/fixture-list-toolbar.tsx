'use client';

import { ICON_SIZE } from '@/lib/constants';
import { globalMessages } from '@/lib/i18n/global-messages';
import { useTranslation } from '@/lib/i18n/use-translation';
import {
  ExportFixturesDocument,
  GetFixtureVendorsDocument,
  GetFixturesDocument,
  ImportFixturesDocument,
  ImportFixturesInput,
} from '@/shared/types/graphql/graphql';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Button, FileButton, Group } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { DownloadSimpleIcon, UploadSimpleIcon } from '@phosphor-icons/react';
import { downloadJsonFile } from './download-json-file';

const FixtureListToolbar = () => {
  const { t } = useTranslation();
  const client = useApolloClient();
  const [importFixtures, { loading: importing }] = useMutation(ImportFixturesDocument);

  const handleExport = async () => {
    try {
      const { data } = await client.query({ query: ExportFixturesDocument, fetchPolicy: 'network-only' });
      if (!data) {
        throw new Error('empty export');
      }
      downloadJsonFile('fixtures.json', data.exportFixtures);
      notifications.show({
        color: 'green',
        title: t({ id: 'Home.exported', defaultMessage: 'Fixtures exported' }),
        message: t({ id: 'Home.title', defaultMessage: 'Home' }),
      });
    } catch {
      notifications.show({
        color: 'red',
        title: t(globalMessages.error),
        message: t({ id: 'Home.exportError', defaultMessage: 'Failed to export fixtures' }),
      });
    }
  };

  const handleImport = async (file: File | null) => {
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const document = JSON.parse(text) as ImportFixturesInput;
      await importFixtures({
        variables: { document },
        refetchQueries: [{ query: GetFixturesDocument }, { query: GetFixtureVendorsDocument }],
      });
      notifications.show({
        color: 'green',
        title: t({ id: 'Home.imported', defaultMessage: 'Fixtures imported' }),
        message: file.name,
      });
    } catch {
      notifications.show({
        color: 'red',
        title: t(globalMessages.error),
        message: t({ id: 'Home.importError', defaultMessage: 'Failed to import fixtures' }),
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
            {t({ id: 'Home.import', defaultMessage: 'Import fixtures' })}
          </Button>
        )}
      </FileButton>
      <Button
        variant="default"
        onClick={() => void handleExport()}
        rightSection={<DownloadSimpleIcon size={ICON_SIZE} weight="duotone" />}
      >
        {t({ id: 'Home.export', defaultMessage: 'Export fixtures' })}
      </Button>
    </Group>
  );
};

export default FixtureListToolbar;
