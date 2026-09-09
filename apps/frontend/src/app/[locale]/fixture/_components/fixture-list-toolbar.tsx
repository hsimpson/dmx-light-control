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
import { CombinedGraphQLErrors } from '@apollo/client';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Button, FileButton, Group } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { DownloadSimpleIcon, UploadSimpleIcon } from '@phosphor-icons/react';
import { downloadJsonFile } from './download-json-file';

function importErrorMessage(error: unknown, fallback: string): string {
  if (CombinedGraphQLErrors.is(error)) {
    const message = error.errors.find(graphQLError => graphQLError.message)?.message;
    if (message) {
      return message;
    }
  }
  return fallback;
}

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
        title: t({ id: 'FixtureList.exported', defaultMessage: 'Fixtures exported' }),
        message: t({ id: 'FixtureList.title', defaultMessage: 'Fixture list' }),
      });
    } catch {
      notifications.show({
        color: 'red',
        title: t(globalMessages.error),
        message: t({ id: 'FixtureList.exportError', defaultMessage: 'Failed to export fixtures' }),
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
        title: t({ id: 'FixtureList.imported', defaultMessage: 'Fixtures imported' }),
        message: file.name,
      });
    } catch (error) {
      notifications.show({
        color: 'red',
        title: t(globalMessages.error),
        message: importErrorMessage(
          error,
          t({ id: 'FixtureList.importError', defaultMessage: 'Failed to import fixtures' }),
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
            {t({ id: 'FixtureList.import', defaultMessage: 'Import fixtures' })}
          </Button>
        )}
      </FileButton>
      <Button
        variant="default"
        onClick={() => void handleExport()}
        rightSection={<DownloadSimpleIcon size={ICON_SIZE} weight="duotone" />}
      >
        {t({ id: 'FixtureList.export', defaultMessage: 'Export fixtures' })}
      </Button>
    </Group>
  );
};

export default FixtureListToolbar;
