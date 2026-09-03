'use client';
import { DateTime } from '@/components/date-time';
import { Loading } from '@/components/loading';
import { ICON_SIZE } from '@/lib/constants';
import { globalMessages } from '@/lib/i18n/global-messages';
import { useTranslation } from '@/lib/i18n/use-translation';
import {
  CreateProjectDocument,
  DeleteProjectDocument,
  GetProjectsDocument,
  GetProjectsQuery,
  UpdateProjectDocument,
} from '@/shared/types/graphql/graphql';
import { useMutation, useQuery } from '@apollo/client/react';
import { ActionIcon, Button, Group, Modal, TextInput } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { PencilSimpleIcon, PlusCircleIcon, TrashIcon } from '@phosphor-icons/react';
import { DataTable } from 'mantine-datatable';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Project = GetProjectsQuery['projects'][number];

const ProjectTable = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, loading } = useQuery(GetProjectsDocument);
  const [deleteProject, { loading: deleting }] = useMutation(DeleteProjectDocument);
  const [createProject, { loading: creating }] = useMutation(CreateProjectDocument);
  const [updateProject, { loading: updating }] = useMutation(UpdateProjectDocument);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [projectToRename, setProjectToRename] = useState<Project | null>(null);
  const [confirmOpened, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [renameOpened, { open: openRename, close: closeRename }] = useDisclosure(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [renameName, setRenameName] = useState('');

  if (loading) {
    return <Loading />;
  }

  const handleDeleteClick = (project: Project) => {
    setProjectToDelete(project);
    openConfirm();
  };

  const handleRenameClick = (project: Project) => {
    setProjectToRename(project);
    setRenameName(project.name);
    openRename();
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) {
      return;
    }

    try {
      const { data: result } = await deleteProject({
        variables: { publicId: projectToDelete.publicId },
        update: cache => {
          cache.evict({ id: cache.identify({ __typename: 'ProjectDto', publicId: projectToDelete.publicId }) });
        },
      });

      if (result?.deleteProject.deleted) {
        notifications.show({
          color: 'green',
          title: t({ id: 'ProjectList.deleted', defaultMessage: 'Project deleted' }),
          message: projectToDelete.name,
        });
      }
    } catch {
      notifications.show({
        color: 'red',
        title: t(globalMessages.error),
        message: t({ id: 'ProjectList.deleteError', defaultMessage: 'Failed to delete project' }),
      });
    } finally {
      closeConfirm();
      setProjectToDelete(null);
    }
  };

  const handleCreate = async () => {
    const name = newProjectName.trim();
    if (!name) {
      return;
    }

    try {
      await createProject({
        variables: { name },
        update: (cache, { data: result }) => {
          const created = result?.createProject;
          if (!created) {
            return;
          }
          cache.updateQuery({ query: GetProjectsDocument }, existing => ({
            projects: [...(existing?.projects ?? []), created],
          }));
        },
      });

      notifications.show({
        color: 'green',
        title: t({ id: 'ProjectList.created', defaultMessage: 'Project created' }),
        message: name,
      });
      setNewProjectName('');
    } catch {
      notifications.show({
        color: 'red',
        title: t(globalMessages.error),
        message: t({ id: 'ProjectList.createError', defaultMessage: 'Failed to create project' }),
      });
    } finally {
      closeCreate();
    }
  };

  const handleRename = async () => {
    if (!projectToRename) {
      return;
    }

    const name = renameName.trim();
    if (!name || name === projectToRename.name) {
      return;
    }

    try {
      await updateProject({
        variables: { input: { publicId: projectToRename.publicId, name } },
      });

      notifications.show({
        color: 'green',
        title: t({ id: 'ProjectList.renamed', defaultMessage: 'Project renamed' }),
        message: name,
      });
    } catch {
      notifications.show({
        color: 'red',
        title: t(globalMessages.error),
        message: t({ id: 'ProjectList.renameError', defaultMessage: 'Failed to rename project' }),
      });
    } finally {
      closeRename();
      setProjectToRename(null);
    }
  };

  const projects = data?.projects ?? [];
  const createDisabled = !newProjectName.trim() || creating;
  const renameDisabled = !renameName.trim() || renameName.trim() === projectToRename?.name || updating;

  return (
    <>
      <Group justify="flex-end" mb="md">
        <Button rightSection={<PlusCircleIcon size={ICON_SIZE} weight="duotone" />} onClick={openCreate}>
          {t({ id: 'ProjectList.create', defaultMessage: 'Add project' })}
        </Button>
      </Group>
      <DataTable
        withTableBorder
        borderRadius="sm"
        withColumnBorders
        striped
        highlightOnHover
        idAccessor="publicId"
        records={projects}
        fetching={loading}
        columns={[
          {
            accessor: 'name',
            title: t({
              id: 'ProjectList.Table.name',
              defaultMessage: 'Name',
            }),
          },
          {
            accessor: 'createdAt',
            title: t(globalMessages.createdAt),
            render: project => <DateTime date={project.createdAt} />,
          },
          {
            accessor: 'updatedAt',
            title: t(globalMessages.updatedAt),
            render: project => <DateTime date={project.updatedAt} />,
          },
          {
            accessor: 'actions',
            title: '',
            textAlign: 'right',
            render: project => {
              return (
                <Group gap={4} justify="right" wrap="nowrap">
                  <ActionIcon
                    aria-label={t({ id: 'ProjectList.rename', defaultMessage: 'Rename project' })}
                    onClick={event => {
                      event.stopPropagation();
                      handleRenameClick(project);
                    }}
                  >
                    <PencilSimpleIcon size={ICON_SIZE} weight="fill" />
                  </ActionIcon>
                  <ActionIcon
                    aria-label={t({ id: 'ProjectList.delete', defaultMessage: 'Delete project' })}
                    onClick={event => {
                      event.stopPropagation();
                      handleDeleteClick(project);
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
          router.push(`/project/${record.record.publicId}`);
        }}
      />
      <Modal
        opened={confirmOpened}
        onClose={closeConfirm}
        title={t({ id: 'ProjectList.confirmDelete', defaultMessage: 'Delete project?' })}
        centered
      >
        <Group justify="space-between">
          <Button variant="default" onClick={closeConfirm}>
            {t(globalMessages.cancel)}
          </Button>
          <Button color="red" loading={deleting} onClick={() => void handleConfirmDelete()}>
            {t({ id: 'ProjectList.delete', defaultMessage: 'Delete project' })}
          </Button>
        </Group>
      </Modal>
      <Modal
        opened={createOpened}
        onClose={closeCreate}
        title={t({ id: 'ProjectList.create', defaultMessage: 'Add project' })}
        centered
      >
        <TextInput
          data-autofocus
          label={t({ id: 'ProjectList.name', defaultMessage: 'Name' })}
          placeholder={t({ id: 'ProjectList.name', defaultMessage: 'Name' })}
          value={newProjectName}
          onChange={event => {
            setNewProjectName(event.currentTarget.value);
          }}
          onKeyDown={event => {
            if (event.key === 'Enter' && !createDisabled) {
              void handleCreate();
            }
          }}
          mb="md"
        />
        <Group justify="space-between">
          <Button variant="default" onClick={closeCreate}>
            {t(globalMessages.cancel)}
          </Button>
          <Button loading={creating} disabled={createDisabled} onClick={() => void handleCreate()}>
            {t({ id: 'ProjectList.create', defaultMessage: 'Add project' })}
          </Button>
        </Group>
      </Modal>
      <Modal
        opened={renameOpened}
        onClose={closeRename}
        title={t({ id: 'ProjectList.rename', defaultMessage: 'Rename project' })}
        centered
      >
        <TextInput
          data-autofocus
          label={t({ id: 'ProjectList.name', defaultMessage: 'Name' })}
          placeholder={t({ id: 'ProjectList.name', defaultMessage: 'Name' })}
          value={renameName}
          onChange={event => {
            setRenameName(event.currentTarget.value);
          }}
          onKeyDown={event => {
            if (event.key === 'Enter' && !renameDisabled) {
              void handleRename();
            }
          }}
          mb="md"
        />
        <Group justify="space-between">
          <Button variant="default" onClick={closeRename}>
            {t(globalMessages.cancel)}
          </Button>
          <Button loading={updating} disabled={renameDisabled} onClick={() => void handleRename()}>
            {t(globalMessages.save)}
          </Button>
        </Group>
      </Modal>
    </>
  );
};

export default ProjectTable;
