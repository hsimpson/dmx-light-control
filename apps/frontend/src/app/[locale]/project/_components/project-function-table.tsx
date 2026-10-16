'use client';

import { Loading } from '@/components/loading';
import { ICON_SIZE } from '@/lib/constants';
import { useTranslation } from '@/lib/i18n/use-translation';
import { DeleteProjectFunctionDocument, GetProjectDocument } from '@/shared/types/graphql/graphql';
import { useMutation, useQuery } from '@apollo/client/react';
import { ActionIcon, Button, Group, Modal, Stack, Text } from '@mantine/core';
import { PencilSimpleIcon, PlusCircleIcon, TrashIcon } from '@phosphor-icons/react';
import { DataTable } from 'mantine-datatable';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ProjectFunctionRow } from './project-function-mapping';
import { findFunctionBindings } from './virtual-console-document';

type ProjectFunctionTableProperties = {
  projectPublicId: string;
};

const ProjectFunctionTable = ({ projectPublicId }: ProjectFunctionTableProperties) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, loading } = useQuery(GetProjectDocument, {
    variables: { publicId: projectPublicId },
    skip: !projectPublicId,
  });
  const [deleteProjectFunction, { loading: deleting }] = useMutation(DeleteProjectFunctionDocument);
  const [functionToDelete, setFunctionToDelete] = useState<ProjectFunctionRow | null>(null);

  if (loading && !data) {
    return <Loading />;
  }

  const functions = data?.project?.projectFunctions ?? [];
  const bindings = functionToDelete
    ? findFunctionBindings(data?.project?.virtualConsole, functionToDelete.publicId)
    : [];

  return (
    <Stack>
      <Group justify="flex-end">
        <Button
          leftSection={<PlusCircleIcon size={ICON_SIZE} />}
          onClick={() => {
            router.push(`/project/${projectPublicId}/functions/new`);
          }}
        >
          {t({ id: 'ProjectFunction.add', defaultMessage: 'Add function' })}
        </Button>
      </Group>
      <DataTable
        records={functions}
        idAccessor="publicId"
        columns={[
          { accessor: 'name', title: t({ id: 'ProjectFunction.name', defaultMessage: 'Name' }) },
          { accessor: 'type', title: t({ id: 'ProjectFunction.type', defaultMessage: 'Type' }) },
          {
            accessor: 'direction',
            title: t({ id: 'ProjectFunction.direction', defaultMessage: 'Direction' }),
            render: fn => fn.sequence?.direction ?? '',
          },
          {
            accessor: 'runOrder',
            title: t({ id: 'ProjectFunction.runOrder', defaultMessage: 'Run order' }),
            render: fn => fn.sequence?.runOrder ?? '',
          },
          {
            accessor: 'steps',
            title: t({ id: 'ProjectFunction.steps', defaultMessage: 'Steps' }),
            render: fn => fn.sequence?.steps.length ?? 0,
          },
          {
            accessor: 'actions',
            title: '',
            render: fn => (
              <Group gap="xs" justify="flex-end">
                <ActionIcon
                  variant="subtle"
                  aria-label={t({ id: 'ProjectFunction.edit', defaultMessage: 'Edit function' })}
                  onClick={() => {
                    router.push(`/project/${projectPublicId}/functions/${fn.publicId}`);
                  }}
                >
                  <PencilSimpleIcon />
                </ActionIcon>
                <ActionIcon
                  color="red"
                  variant="subtle"
                  aria-label={t({ id: 'ProjectFunction.delete', defaultMessage: 'Delete function' })}
                  onClick={() => {
                    setFunctionToDelete(fn);
                  }}
                >
                  <TrashIcon />
                </ActionIcon>
              </Group>
            ),
          },
        ]}
      />
      <Modal
        opened={functionToDelete !== null}
        title={t({ id: 'ProjectFunction.deleteTitle', defaultMessage: 'Delete function' })}
        onClose={() => {
          setFunctionToDelete(null);
        }}
      >
        <Stack>
          <Text>
            {t(
              {
                id: 'ProjectFunction.deleteConfirm',
                defaultMessage: 'Delete {name}?',
              },
              { name: functionToDelete?.name ?? '' },
            )}
          </Text>
          {bindings.length > 0 ? (
            <Stack gap={4}>
              <Text c="orange">
                {t({
                  id: 'ProjectFunction.deleteBoundWarning',
                  defaultMessage: 'This function is bound to virtual console controls:',
                })}
              </Text>
              {bindings.map(binding => (
                <Text key={`${binding.pageName}-${binding.label}`}>
                  {binding.pageName} / {binding.label}
                </Text>
              ))}
            </Stack>
          ) : null}
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                setFunctionToDelete(null);
              }}
            >
              {t({ id: 'ProjectFunction.cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Button
              color="red"
              loading={deleting}
              onClick={() => {
                if (!functionToDelete) {
                  return;
                }
                void deleteProjectFunction({
                  variables: { publicId: functionToDelete.publicId },
                  refetchQueries: [{ query: GetProjectDocument, variables: { publicId: projectPublicId } }],
                }).then(() => {
                  setFunctionToDelete(null);
                });
              }}
            >
              {t({ id: 'ProjectFunction.delete', defaultMessage: 'Delete function' })}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

export default ProjectFunctionTable;
