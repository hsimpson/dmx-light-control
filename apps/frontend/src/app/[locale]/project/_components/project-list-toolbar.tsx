'use client';

import { downloadJsonFile } from '@/app/[locale]/fixture/_components/download-json-file';
import { ICON_SIZE } from '@/lib/constants';
import { globalMessages } from '@/lib/i18n/global-messages';
import { useTranslation } from '@/lib/i18n/use-translation';
import {
  ExportProjectsDocument,
  GetProjectsDocument,
  ImportProjectsDocument,
  ImportProjectsInput,
} from '@/shared/types/graphql/graphql';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Button, FileButton, Group } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { DownloadSimpleIcon, UploadSimpleIcon } from '@phosphor-icons/react';

const ProjectListToolbar = () => {
  const { t } = useTranslation();
  const client = useApolloClient();
  const [importProjects, { loading: importing }] = useMutation(ImportProjectsDocument);

  const handleExport = async () => {
    try {
      const { data } = await client.query({ query: ExportProjectsDocument, fetchPolicy: 'network-only' });
      if (!data) {
        throw new Error('empty export');
      }
      downloadJsonFile('projects.json', data.exportProjects);
      notifications.show({
        color: 'green',
        title: t({ id: 'ProjectList.exported', defaultMessage: 'Projects exported' }),
        message: t({ id: 'ProjectList.title', defaultMessage: 'Project list' }),
      });
    } catch {
      notifications.show({
        color: 'red',
        title: t(globalMessages.error),
        message: t({ id: 'ProjectList.exportError', defaultMessage: 'Failed to export projects' }),
      });
    }
  };

  const handleImport = async (file: File | null) => {
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const document = JSON.parse(text) as ImportProjectsInput;
      await importProjects({
        variables: { document },
        refetchQueries: [{ query: GetProjectsDocument }],
      });
      notifications.show({
        color: 'green',
        title: t({ id: 'ProjectList.imported', defaultMessage: 'Projects imported' }),
        message: file.name,
      });
    } catch {
      notifications.show({
        color: 'red',
        title: t(globalMessages.error),
        message: t({ id: 'ProjectList.importError', defaultMessage: 'Failed to import projects' }),
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
            {t({ id: 'ProjectList.import', defaultMessage: 'Import projects' })}
          </Button>
        )}
      </FileButton>
      <Button
        variant="default"
        onClick={() => void handleExport()}
        rightSection={<DownloadSimpleIcon size={ICON_SIZE} weight="duotone" />}
      >
        {t({ id: 'ProjectList.export', defaultMessage: 'Export projects' })}
      </Button>
    </Group>
  );
};

export default ProjectListToolbar;
