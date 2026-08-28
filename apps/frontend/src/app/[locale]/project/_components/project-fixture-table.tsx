'use client';

import { Loading } from '@/components/loading';
import { ICON_SIZE } from '@/lib/constants';
import { globalMessages } from '@/lib/i18n/global-messages';
import { useTranslation } from '@/lib/i18n/use-translation';
import {
  AddProjectFixtureDocument,
  DeleteProjectFixtureDocument,
  GetFixturesDocument,
  GetProjectDocument,
  GetProjectQuery,
  UpdateProjectFixtureDocument,
} from '@/shared/types/graphql/graphql';
import { useMutation, useQuery } from '@apollo/client/react';
import { ActionIcon, Button, Group, Modal, NumberInput, Select, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { PencilSimpleIcon, PlusCircleIcon, TrashIcon } from '@phosphor-icons/react';
import { DataTable } from 'mantine-datatable';
import { useMemo, useState } from 'react';

type ProjectFixture = NonNullable<GetProjectQuery['project']>['projectFixtures'][number];

type ProjectFixtureTableProperties = {
  projectPublicId: string;
};

function channelCount(fixture: ProjectFixture): number {
  return fixture.channelMode.fixtureChannelAssignments.length;
}

function endAddress(fixture: ProjectFixture): number {
  return fixture.startAddress + channelCount(fixture) - 1;
}

const ProjectFixtureTable = ({ projectPublicId }: ProjectFixtureTableProperties) => {
  const { t } = useTranslation();
  const { data, loading } = useQuery(GetProjectDocument, {
    variables: { publicId: projectPublicId },
    skip: !projectPublicId,
  });
  const { data: fixturesData } = useQuery(GetFixturesDocument);
  const [addProjectFixture, { loading: adding }] = useMutation(AddProjectFixtureDocument);
  const [updateProjectFixture, { loading: updating }] = useMutation(UpdateProjectFixtureDocument);
  const [deleteProjectFixture, { loading: deleting }] = useMutation(DeleteProjectFixtureDocument);
  const [fixtureToDelete, setFixtureToDelete] = useState<ProjectFixture | null>(null);
  const [fixtureToEdit, setFixtureToEdit] = useState<ProjectFixture | null>(null);
  const [confirmOpened, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);
  const [formOpened, { open: openForm, close: closeForm }] = useDisclosure(false);
  const [selectedFixturePublicId, setSelectedFixturePublicId] = useState<string | null>(null);
  const [selectedModePublicId, setSelectedModePublicId] = useState<string | null>(null);
  const [startAddress, setStartAddress] = useState<number | string>(1);

  const fixtures = useMemo(() => fixturesData?.fixtures ?? [], [fixturesData?.fixtures]);
  const projectFixtures = data?.project?.projectFixtures ?? [];

  const fixtureOptions = useMemo(
    () =>
      fixtures.map(fixture => ({
        value: fixture.publicId,
        label: `${fixture.fixtureVendor.name} – ${fixture.name}`,
      })),
    [fixtures],
  );

  const selectedFixture = fixtures.find(fixture => fixture.publicId === selectedFixturePublicId);

  const modeOptions = useMemo(
    () =>
      (selectedFixture?.fixtureChannelModes ?? [])
        .filter(mode => mode.fixtureChannelAssignments.length > 0)
        .map(mode => ({
          value: mode.publicId,
          label: mode.name,
        })),
    [selectedFixture],
  );

  const selectedMode = selectedFixture?.fixtureChannelModes.find(mode => mode.publicId === selectedModePublicId);
  const previewChannelCount = selectedMode?.fixtureChannelAssignments.length ?? 0;
  const previewStartAddress = typeof startAddress === 'number' ? startAddress : Number(startAddress);
  const previewEndAddress =
    previewChannelCount > 0 && Number.isFinite(previewStartAddress)
      ? previewStartAddress + previewChannelCount - 1
      : null;

  const resetForm = () => {
    setFixtureToEdit(null);
    setSelectedFixturePublicId(null);
    setSelectedModePublicId(null);
    setStartAddress(1);
  };

  const openCreateForm = () => {
    resetForm();
    openForm();
  };

  const openEditForm = (fixture: ProjectFixture) => {
    setFixtureToEdit(fixture);
    setSelectedFixturePublicId(fixture.fixture.publicId);
    setSelectedModePublicId(fixture.channelMode.publicId);
    setStartAddress(fixture.startAddress);
    openForm();
  };

  const handleConfirmDelete = async () => {
    if (!fixtureToDelete) {
      return;
    }

    try {
      const { data: result } = await deleteProjectFixture({
        variables: { publicId: fixtureToDelete.publicId },
        refetchQueries: [{ query: GetProjectDocument, variables: { publicId: projectPublicId } }],
      });

      if (result?.deleteProjectFixture.deleted) {
        notifications.show({
          color: 'green',
          title: t({ id: 'ProjectFixtures.deleted', defaultMessage: 'Fixture removed from project' }),
          message: fixtureToDelete.fixture.name,
        });
      }
    } catch {
      notifications.show({
        color: 'red',
        title: t(globalMessages.error),
        message: t({ id: 'ProjectFixtures.deleteError', defaultMessage: 'Failed to remove fixture from project' }),
      });
    } finally {
      closeConfirm();
      setFixtureToDelete(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFixturePublicId || !selectedModePublicId) {
      return;
    }

    const parsedStartAddress = typeof startAddress === 'number' ? startAddress : Number(startAddress);
    if (!Number.isFinite(parsedStartAddress) || parsedStartAddress < 1 || parsedStartAddress > 512) {
      return;
    }

    try {
      if (fixtureToEdit) {
        await updateProjectFixture({
          variables: {
            input: {
              publicId: fixtureToEdit.publicId,
              channelModePublicId: selectedModePublicId,
              startAddress: parsedStartAddress,
            },
          },
          refetchQueries: [{ query: GetProjectDocument, variables: { publicId: projectPublicId } }],
        });
        notifications.show({
          color: 'green',
          title: t({ id: 'ProjectFixtures.updated', defaultMessage: 'Project fixture updated' }),
          message: fixtureToEdit.fixture.name,
        });
      } else {
        await addProjectFixture({
          variables: {
            input: {
              projectPublicId,
              fixturePublicId: selectedFixturePublicId,
              channelModePublicId: selectedModePublicId,
              startAddress: parsedStartAddress,
            },
          },
          refetchQueries: [{ query: GetProjectDocument, variables: { publicId: projectPublicId } }],
        });
        notifications.show({
          color: 'green',
          title: t({ id: 'ProjectFixtures.created', defaultMessage: 'Fixture added to project' }),
          message: selectedFixture?.name ?? '',
        });
      }
      closeForm();
      resetForm();
    } catch {
      notifications.show({
        color: 'red',
        title: t(globalMessages.error),
        message: fixtureToEdit
          ? t({ id: 'ProjectFixtures.updateError', defaultMessage: 'Failed to update project fixture' })
          : t({ id: 'ProjectFixtures.createError', defaultMessage: 'Failed to add fixture to project' }),
      });
    }
  };

  if (loading) {
    return <Loading />;
  }

  const submitDisabled =
    !selectedFixturePublicId ||
    !selectedModePublicId ||
    !Number.isFinite(typeof startAddress === 'number' ? startAddress : Number(startAddress)) ||
    adding ||
    updating;

  return (
    <>
      <Group justify="flex-end" mb="md">
        <Button rightSection={<PlusCircleIcon size={ICON_SIZE} weight="duotone" />} onClick={openCreateForm}>
          {t({ id: 'ProjectFixtures.add', defaultMessage: 'Add fixture' })}
        </Button>
      </Group>
      <DataTable
        withTableBorder
        borderRadius="sm"
        withColumnBorders
        striped
        highlightOnHover
        idAccessor="publicId"
        records={projectFixtures}
        fetching={loading}
        noRecordsText={t({
          id: 'ProjectFixtures.empty',
          defaultMessage: 'No fixtures patched yet',
        })}
        columns={[
          {
            accessor: 'fixture.fixtureVendor.name',
            title: t({ id: 'ProjectFixtures.vendor', defaultMessage: 'Vendor' }),
            render: fixture => fixture.fixture.fixtureVendor.name,
          },
          {
            accessor: 'fixture.name',
            title: t({ id: 'ProjectFixtures.fixture', defaultMessage: 'Fixture' }),
            render: fixture => fixture.fixture.name,
          },
          {
            accessor: 'channelMode.name',
            title: t({ id: 'ProjectFixtures.channelMode', defaultMessage: 'Channel mode' }),
            render: fixture => fixture.channelMode.name,
          },
          {
            accessor: 'startAddress',
            title: t({ id: 'ProjectFixtures.startAddress', defaultMessage: 'Start address' }),
          },
          {
            accessor: 'endAddress',
            title: t({ id: 'ProjectFixtures.endAddress', defaultMessage: 'End address' }),
            render: fixture => endAddress(fixture),
          },
          {
            accessor: 'channelCount',
            title: t({ id: 'ProjectFixtures.channelCount', defaultMessage: 'Channels' }),
            render: fixture => channelCount(fixture),
          },
          {
            accessor: 'actions',
            title: '',
            textAlign: 'right',
            render: fixture => (
              <Group gap={4} justify="right" wrap="nowrap">
                <ActionIcon
                  aria-label={t({ id: 'ProjectFixtures.edit', defaultMessage: 'Edit project fixture' })}
                  onClick={() => {
                    openEditForm(fixture);
                  }}
                >
                  <PencilSimpleIcon size={ICON_SIZE} weight="fill" />
                </ActionIcon>
                <ActionIcon
                  aria-label={t({ id: 'ProjectFixtures.delete', defaultMessage: 'Remove fixture from project' })}
                  onClick={() => {
                    setFixtureToDelete(fixture);
                    openConfirm();
                  }}
                >
                  <TrashIcon size={ICON_SIZE} weight="fill" />
                </ActionIcon>
              </Group>
            ),
          },
        ]}
      />
      <Modal
        opened={confirmOpened}
        onClose={closeConfirm}
        title={t({ id: 'ProjectFixtures.confirmDelete', defaultMessage: 'Remove fixture from project?' })}
        centered
      >
        <Group justify="space-between">
          <Button variant="default" onClick={closeConfirm}>
            {t(globalMessages.cancel)}
          </Button>
          <Button color="red" loading={deleting} onClick={() => void handleConfirmDelete()}>
            {t({ id: 'ProjectFixtures.delete', defaultMessage: 'Remove fixture from project' })}
          </Button>
        </Group>
      </Modal>
      <Modal
        opened={formOpened}
        onClose={() => {
          closeForm();
          resetForm();
        }}
        title={
          fixtureToEdit
            ? t({ id: 'ProjectFixtures.edit', defaultMessage: 'Edit project fixture' })
            : t({ id: 'ProjectFixtures.add', defaultMessage: 'Add fixture' })
        }
        centered
      >
        <Stack gap="md">
          <Select
            label={t({ id: 'ProjectFixtures.fixture', defaultMessage: 'Fixture' })}
            placeholder={t({ id: 'ProjectFixtures.fixturePlaceholder', defaultMessage: 'Select a fixture' })}
            data={fixtureOptions}
            value={selectedFixturePublicId}
            onChange={value => {
              setSelectedFixturePublicId(value);
              setSelectedModePublicId(null);
            }}
            disabled={fixtureToEdit !== null}
            searchable
          />
          <Select
            label={t({ id: 'ProjectFixtures.channelMode', defaultMessage: 'Channel mode' })}
            placeholder={t({ id: 'ProjectFixtures.channelModePlaceholder', defaultMessage: 'Select a channel mode' })}
            data={modeOptions}
            value={selectedModePublicId}
            onChange={setSelectedModePublicId}
            disabled={!selectedFixturePublicId}
            searchable
          />
          <NumberInput
            label={t({ id: 'ProjectFixtures.startAddress', defaultMessage: 'Start address' })}
            min={1}
            max={512}
            value={startAddress}
            onChange={setStartAddress}
          />
          {previewEndAddress !== null ? (
            <Text size="sm">
              {t({ id: 'ProjectFixtures.channelCount', defaultMessage: 'Channels' })}: {previewChannelCount}
              {' · '}
              {t({ id: 'ProjectFixtures.endAddress', defaultMessage: 'End address' })}: {previewEndAddress}
            </Text>
          ) : null}
          <Group justify="space-between">
            <Button
              variant="default"
              onClick={() => {
                closeForm();
                resetForm();
              }}
            >
              {t(globalMessages.cancel)}
            </Button>
            <Button loading={adding || updating} disabled={submitDisabled} onClick={() => void handleSubmit()}>
              {t(globalMessages.save)}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};

export default ProjectFixtureTable;
