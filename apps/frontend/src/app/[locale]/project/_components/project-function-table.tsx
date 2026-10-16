'use client';

import { Loading } from '@/components/loading';
import { ICON_SIZE } from '@/lib/constants';
import { useTranslation } from '@/lib/i18n/use-translation';
import {
  AddProjectFunctionDocument,
  DeleteProjectFunctionDocument,
  GetProjectDocument,
  ProjectFunctionType,
  UpdateProjectFunctionDocument,
} from '@/shared/types/graphql/graphql';
import { useMutation, useQuery } from '@apollo/client/react';
import { ActionIcon, Button, Group, Modal, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { PencilSimpleIcon, PlusCircleIcon, TrashIcon } from '@phosphor-icons/react';
import { DataTable } from 'mantine-datatable';
import { useState } from 'react';
import {
  draftToSequenceInput,
  functionToDraft,
  newFunctionDraft,
  projectSequenceFixtures,
  type ProjectFunctionDraft,
  type ProjectFunctionRow,
} from './project-function-mapping';
import ProjectFunctionModal from './project-function-modal';
import { findFunctionBindings } from './virtual-console-document';

type ProjectFunctionTableProperties = {
  projectPublicId: string;
};

const ProjectFunctionTable = ({ projectPublicId }: ProjectFunctionTableProperties) => {
  const { t } = useTranslation();
  const { data, loading } = useQuery(GetProjectDocument, {
    variables: { publicId: projectPublicId },
    skip: !projectPublicId,
  });
  const [addProjectFunction, { loading: adding }] = useMutation(AddProjectFunctionDocument);
  const [updateProjectFunction, { loading: updating }] = useMutation(UpdateProjectFunctionDocument);
  const [deleteProjectFunction, { loading: deleting }] = useMutation(DeleteProjectFunctionDocument);
  const [editor, setEditor] = useState<{ publicId?: string; draft: ProjectFunctionDraft } | null>(null);
  const [functionToDelete, setFunctionToDelete] = useState<ProjectFunctionRow | null>(null);

  if (loading && !data) {
    return <Loading />;
  }

  const functions = data?.project?.projectFunctions ?? [];
  const fixtures = projectSequenceFixtures(data?.project);
  const bindings = functionToDelete
    ? findFunctionBindings(data?.project?.virtualConsole, functionToDelete.publicId)
    : [];

  const save = async (draft: ProjectFunctionDraft) => {
    const sequence = draftToSequenceInput(draft);
    try {
      if (editor?.publicId) {
        await updateProjectFunction({
          variables: { input: { publicId: editor.publicId, name: draft.name.trim(), sequence } },
          refetchQueries: [{ query: GetProjectDocument, variables: { publicId: projectPublicId } }],
        });
      } else {
        await addProjectFunction({
          variables: {
            input: {
              projectPublicId,
              name: draft.name.trim(),
              type: ProjectFunctionType.Sequence,
              sequence,
            },
          },
          refetchQueries: [{ query: GetProjectDocument, variables: { publicId: projectPublicId } }],
        });
      }
      setEditor(null);
    } catch (error) {
      notifications.show({
        color: 'red',
        message:
          error instanceof Error
            ? error.message
            : t({ id: 'ProjectFunction.saveFailed', defaultMessage: 'Could not save the function.' }),
      });
    }
  };

  return (
    <Stack>
      <Group justify="flex-end">
        <Button
          leftSection={<PlusCircleIcon size={ICON_SIZE} />}
          onClick={() => {
            setEditor({ draft: newFunctionDraft() });
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
                    setEditor({ publicId: fn.publicId, draft: functionToDraft(fn) });
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
      {editor ? (
        <ProjectFunctionModal
          key={editor.publicId ?? 'new'}
          opened
          title={
            editor.publicId
              ? t({ id: 'ProjectFunction.editTitle', defaultMessage: 'Edit function' })
              : t({ id: 'ProjectFunction.addTitle', defaultMessage: 'Add function' })
          }
          fixtures={fixtures}
          initial={editor.draft}
          saving={adding || updating}
          onClose={() => {
            setEditor(null);
          }}
          onSave={draft => {
            void save(draft);
          }}
        />
      ) : null}
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
