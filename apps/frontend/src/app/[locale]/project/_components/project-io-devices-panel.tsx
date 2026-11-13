'use client';

import { Loading } from '@/components/loading';
import { useTranslation } from '@/lib/i18n/use-translation';
import {
  ActiveIoDeviceStatesDocument,
  AvailableIoDevicesDocument,
  GetMidiMappingsDocument,
  GetProjectIoDevicesDocument,
  IoDeviceKind,
  IoDeviceStatus,
  UpdateProjectIoDevicesDocument,
} from '@/shared/types/graphql/graphql';
import { useMutation, useQuery } from '@apollo/client/react';
import { Badge, Checkbox, SegmentedControl, Select, Stack, TextInput, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { DataTable } from 'mantine-datatable';
import { buildIoDeviceRows, toIoDeviceInput, type IoDeviceRow } from './project-io-devices';
import SoundLevelMeter from './sound-level-meter';

// Matches the backend hotplug poll, so plugging a device in shows up within one cycle.
const IO_DEVICE_POLL_INTERVAL_MS = 2000;
const CUSTOM_NAME_MAX_LENGTH = 64;

const STATUS_COLORS: Record<IoDeviceStatus, string> = {
  [IoDeviceStatus.Connected]: 'green',
  [IoDeviceStatus.Missing]: 'red',
  [IoDeviceStatus.Ambiguous]: 'orange',
};

type ProjectIoDevicesPanelProperties = {
  projectPublicId: string;
};

const ProjectIoDevicesPanel = ({ projectPublicId }: ProjectIoDevicesPanelProperties) => {
  const { t } = useTranslation();
  const { data: projectData, loading } = useQuery(GetProjectIoDevicesDocument, {
    variables: { publicId: projectPublicId },
  });
  const { data: availableData } = useQuery(AvailableIoDevicesDocument, { pollInterval: IO_DEVICE_POLL_INTERVAL_MS });
  const { data: statesData } = useQuery(ActiveIoDeviceStatesDocument, { pollInterval: IO_DEVICE_POLL_INTERVAL_MS });
  const { data: mappingsData } = useQuery(GetMidiMappingsDocument);
  const [updateIoDevices, { loading: saving }] = useMutation(UpdateProjectIoDevicesDocument);

  if (loading && !projectData) {
    return <Loading />;
  }

  const configured = projectData?.project?.ioDevices ?? [];
  const rows = buildIoDeviceRows(configured, availableData?.availableIoDevices ?? [], statesData?.ioDevices ?? []);

  const statusLabels: Record<IoDeviceStatus, string> = {
    [IoDeviceStatus.Connected]: t({ id: 'ProjectDetail.io.status.connected', defaultMessage: 'Connected' }),
    [IoDeviceStatus.Missing]: t({ id: 'ProjectDetail.io.status.missing', defaultMessage: 'Not connected' }),
    [IoDeviceStatus.Ambiguous]: t({
      id: 'ProjectDetail.io.status.ambiguous',
      defaultMessage: 'Ambiguous: identical devices on other USB ports',
    }),
  };

  const mappingOptions = (mappingsData?.midiMappings ?? []).map(mapping => ({
    value: mapping.publicId,
    label: mapping.name,
  }));

  const save = async (next: typeof configured) => {
    try {
      await updateIoDevices({
        variables: { input: { publicId: projectPublicId, ioDevices: next.map(toIoDeviceInput) } },
        refetchQueries: [
          { query: GetProjectIoDevicesDocument, variables: { publicId: projectPublicId } },
          { query: ActiveIoDeviceStatesDocument },
        ],
      });
    } catch (error) {
      notifications.show({
        color: 'red',
        message:
          error instanceof Error
            ? error.message
            : t({ id: 'ProjectDetail.io.saveFailed', defaultMessage: 'Could not save the devices.' }),
      });
    }
  };

  const add = (device: IoDeviceRow['device']) =>
    device.kind === IoDeviceKind.SoundInput
      ? // A project has one sound input: picking another replaces it.
        [...configured.filter(entry => entry.kind !== IoDeviceKind.SoundInput), { ...device, audioChannels: 1 }]
      : [...configured, device];

  const toggle = async (row: IoDeviceRow) =>
    save(row.configured ? configured.filter(device => device !== row.device) : add(row.device));

  const setChannels = async (row: IoDeviceRow, audioChannels: number) =>
    save(configured.map(device => (device === row.device ? { ...device, audioChannels } : device)));

  const assignMapping = async (row: IoDeviceRow, midiMappingPublicId: string | null) =>
    save(configured.map(device => (device === row.device ? { ...device, midiMappingPublicId } : device)));

  const rename = async (row: IoDeviceRow, value: string) => {
    const customName = value.trim() || null;
    if (customName !== (row.device.customName ?? null)) {
      await save(configured.map(device => (device === row.device ? { ...device, customName } : device)));
    }
  };

  const customNameColumn = {
    accessor: 'customName',
    title: t({ id: 'ProjectDetail.io.customName', defaultMessage: 'Custom name' }),
    render: (row: IoDeviceRow) => (
      <TextInput
        // Uncontrolled while typing; the key resets it when the row shows another stored name.
        key={row.device.customName ?? ''}
        size="xs"
        maxLength={CUSTOM_NAME_MAX_LENGTH}
        defaultValue={row.device.customName ?? ''}
        placeholder={row.device.name}
        disabled={!row.configured}
        aria-label={t(
          { id: 'ProjectDetail.io.customNameFor', defaultMessage: 'Custom name of {name}' },
          { name: row.device.name },
        )}
        onBlur={event => {
          void rename(row, event.currentTarget.value);
        }}
      />
    ),
  };

  const mappingColumn = {
    accessor: 'midiMappingPublicId',
    title: t({ id: 'ProjectDetail.io.midiMapping', defaultMessage: 'MIDI mapping' }),
    render: (row: IoDeviceRow) => (
      <Select
        size="xs"
        clearable
        data={mappingOptions}
        value={row.device.midiMappingPublicId ?? null}
        disabled={saving || !row.configured}
        placeholder={t({ id: 'ProjectDetail.io.noMidiMapping', defaultMessage: 'None' })}
        aria-label={t(
          { id: 'ProjectDetail.io.midiMappingFor', defaultMessage: 'MIDI mapping for {name}' },
          { name: row.device.name },
        )}
        onChange={value => {
          void assignMapping(row, value);
        }}
      />
    ),
  };

  const soundColumns = [
    {
      accessor: 'audioChannels',
      title: t({ id: 'ProjectDetail.io.channels', defaultMessage: 'Channels' }),
      render: (row: IoDeviceRow) => (
        <SegmentedControl
          size="xs"
          disabled={saving || !row.configured}
          value={String(row.device.audioChannels ?? 1)}
          aria-label={t(
            { id: 'ProjectDetail.io.channelsFor', defaultMessage: 'Channels of {name}' },
            { name: row.device.name },
          )}
          data={[
            { value: '1', label: t({ id: 'ProjectDetail.io.mono', defaultMessage: 'Mono' }) },
            {
              value: '2',
              label: t({ id: 'ProjectDetail.io.stereo', defaultMessage: 'Stereo' }),
              disabled: (row.maxInputChannels ?? 2) < 2,
            },
          ]}
          onChange={value => {
            void setChannels(row, Number(value));
          }}
        />
      ),
    },
    {
      accessor: 'level',
      title: t({ id: 'ProjectDetail.io.level', defaultMessage: 'Level' }),
      render: (row: IoDeviceRow) =>
        row.configured && row.status === IoDeviceStatus.Connected ? (
          <SoundLevelMeter deviceName={row.device.name} channels={row.device.audioChannels ?? 1} />
        ) : null,
    },
  ];

  const renderTable = (kind: IoDeviceKind) => (
    <DataTable
      withTableBorder
      borderRadius="sm"
      withColumnBorders
      striped
      highlightOnHover
      minHeight={150}
      records={rows.filter(row => row.device.kind === kind)}
      idAccessor="key"
      noRecordsText={t({ id: 'ProjectDetail.io.noDevices', defaultMessage: 'No devices connected or configured' })}
      columns={[
        {
          accessor: 'configured',
          title: t({ id: 'ProjectDetail.io.used', defaultMessage: 'Use' }),
          width: 70,
          render: row => (
            <Checkbox
              checked={row.configured}
              disabled={saving}
              aria-label={t(
                { id: 'ProjectDetail.io.useDevice', defaultMessage: 'Use {name} in this project' },
                { name: row.device.name },
              )}
              onChange={() => {
                void toggle(row);
              }}
            />
          ),
        },
        {
          accessor: 'name',
          title: t({ id: 'ProjectDetail.io.name', defaultMessage: 'Device' }),
          render: row => row.device.name,
        },
        ...(kind === IoDeviceKind.Midi ? [customNameColumn] : []),
        {
          accessor: 'manufacturer',
          title: t({ id: 'ProjectDetail.io.manufacturer', defaultMessage: 'Manufacturer' }),
          render: row => row.device.manufacturer ?? '',
        },
        {
          accessor: 'serial',
          title: t({ id: 'ProjectDetail.io.serial', defaultMessage: 'Serial number' }),
          render: row => row.device.serial ?? '',
        },
        {
          accessor: 'usbLocation',
          title: t({ id: 'ProjectDetail.io.usbPort', defaultMessage: 'USB port' }),
          render: row => row.device.usbLocation ?? '',
        },
        {
          accessor: 'status',
          title: t({ id: 'ProjectDetail.io.status', defaultMessage: 'Status' }),
          render: row =>
            row.status ? (
              <Badge variant="light" color={STATUS_COLORS[row.status]}>
                {statusLabels[row.status]}
              </Badge>
            ) : null,
        },
        ...(kind === IoDeviceKind.Midi ? [mappingColumn] : []),
        ...(kind === IoDeviceKind.SoundInput ? soundColumns : []),
      ]}
    />
  );

  return (
    <Stack>
      <Title order={3}>{t({ id: 'ProjectDetail.io.dmxOutputs', defaultMessage: 'DMX outputs' })}</Title>
      {renderTable(IoDeviceKind.DmxSerial)}
      <Title order={3}>{t({ id: 'ProjectDetail.io.midiDevices', defaultMessage: 'MIDI controllers' })}</Title>
      {renderTable(IoDeviceKind.Midi)}
      <Title order={3}>{t({ id: 'ProjectDetail.io.soundInputs', defaultMessage: 'Sound input' })}</Title>
      {renderTable(IoDeviceKind.SoundInput)}
    </Stack>
  );
};

export default ProjectIoDevicesPanel;
