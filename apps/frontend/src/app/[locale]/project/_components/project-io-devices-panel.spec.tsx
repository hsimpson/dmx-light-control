import {
  ActiveIoDeviceStatesDocument,
  AvailableIoDevicesDocument,
  GetProjectIoDevicesDocument,
  IoDeviceKind,
  IoDeviceStatus,
  UpdateProjectIoDevicesDocument,
} from '@/shared/types/graphql/graphql';
import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import ProjectIoDevicesPanel from './project-io-devices-panel';

vi.mock('mantine-datatable', () => ({
  DataTable: ({
    records,
    columns,
    noRecordsText,
  }: {
    records: Record<string, unknown>[];
    columns: { accessor: string; render?: (record: Record<string, unknown>) => ReactNode }[];
    noRecordsText?: string;
  }) =>
    records.length === 0 ? (
      <p>{noRecordsText}</p>
    ) : (
      <table>
        <tbody>
          {records.map(record => (
            <tr key={String(record.key)}>
              {columns.map(column => (
                <td key={column.accessor}>{column.render?.(record)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    ),
}));

const ftdi = {
  kind: IoDeviceKind.DmxSerial,
  name: 'FT232R USB UART',
  manufacturer: 'FTDI',
  serial: 'A50285BI',
  vendorId: '0403',
  productId: '6001',
  usbLocation: '3-10',
};

const apc = {
  kind: IoDeviceKind.Midi,
  name: 'APC mini mk2',
  manufacturer: 'AKAI professional',
  serial: 'Ver00.10',
  vendorId: '09e8',
  productId: '004f',
  usbLocation: '3-9',
};

const asDto = (device: typeof ftdi) => ({ __typename: 'IoDeviceDto' as const, ...device });

const projectIoDevices = (devices: (typeof ftdi)[]) => ({
  request: { query: GetProjectIoDevicesDocument, variables: { publicId: 'proj-1' } },
  result: {
    data: { project: { __typename: 'ProjectDto' as const, publicId: 'proj-1', ioDevices: devices.map(asDto) } },
  },
});

const availableIoDevices = (devices: (typeof ftdi)[]) => ({
  request: { query: AvailableIoDevicesDocument },
  result: { data: { availableIoDevices: devices.map(asDto) } },
});

const activeStates = (states: (typeof ftdi & { status: IoDeviceStatus })[]) => ({
  request: { query: ActiveIoDeviceStatesDocument },
  result: { data: { ioDevices: states.map(state => ({ __typename: 'IoDeviceStateDto' as const, ...state })) } },
});

describe('ProjectIoDevicesPanel', () => {
  it('GIVEN a configured output and a plugged-in controller WHEN rendered THEN both sections list them with status', async () => {
    renderWithProviders(<ProjectIoDevicesPanel projectPublicId="proj-1" />, {
      apolloMocks: [
        projectIoDevices([ftdi]),
        availableIoDevices([ftdi, apc]),
        activeStates([{ ...ftdi, status: IoDeviceStatus.Connected }]),
      ],
    });

    const ftdiCheckbox = await screen.findByRole('checkbox', { name: 'Use FT232R USB UART in this project' });
    expect(ftdiCheckbox).toBeChecked();
    expect(await screen.findByText('Connected')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Use APC mini mk2 in this project' })).not.toBeChecked();
    expect(screen.getByText('A50285BI')).toBeInTheDocument();
    expect(screen.getByText('DMX outputs')).toBeInTheDocument();
    expect(screen.getByText('MIDI controllers')).toBeInTheDocument();
  });

  it('GIVEN an unused controller WHEN its checkbox is ticked THEN the full device list is saved', async () => {
    const save = vi.fn(() => ({
      data: {
        updateProjectIoDevices: {
          __typename: 'ProjectDto' as const,
          publicId: 'proj-1',
          ioDevices: [ftdi, apc].map(asDto),
        },
      },
    }));
    const { user } = renderWithProviders(<ProjectIoDevicesPanel projectPublicId="proj-1" />, {
      apolloMocks: [
        projectIoDevices([ftdi]),
        availableIoDevices([ftdi, apc]),
        activeStates([]),
        {
          request: {
            query: UpdateProjectIoDevicesDocument,
            variables: { input: { publicId: 'proj-1', ioDevices: [ftdi, apc] } },
          },
          result: save,
        },
        projectIoDevices([ftdi, apc]),
        activeStates([
          { ...ftdi, status: IoDeviceStatus.Connected },
          { ...apc, status: IoDeviceStatus.Connected },
        ]),
      ],
    });

    await user.click(await screen.findByRole('checkbox', { name: 'Use APC mini mk2 in this project' }));

    expect(
      await screen.findByRole('checkbox', { name: 'Use APC mini mk2 in this project', checked: true }),
    ).toBeInTheDocument();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('GIVEN a configured device WHEN unticked THEN it is removed from the saved list', async () => {
    const save = vi.fn(() => ({
      data: { updateProjectIoDevices: { __typename: 'ProjectDto' as const, publicId: 'proj-1', ioDevices: [] } },
    }));
    const { user } = renderWithProviders(<ProjectIoDevicesPanel projectPublicId="proj-1" />, {
      apolloMocks: [
        projectIoDevices([apc]),
        availableIoDevices([]),
        activeStates([{ ...apc, status: IoDeviceStatus.Missing }]),
        {
          request: {
            query: UpdateProjectIoDevicesDocument,
            variables: { input: { publicId: 'proj-1', ioDevices: [] } },
          },
          result: save,
        },
        projectIoDevices([]),
        activeStates([]),
      ],
    });

    expect(await screen.findByText('Not connected')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Use APC mini mk2 in this project' }));

    await waitFor(() => {
      expect(screen.getAllByText('No devices connected or configured')).toHaveLength(2);
    });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('GIVEN identical devices on unknown ports WHEN rendered THEN the ambiguous status is explained', async () => {
    renderWithProviders(<ProjectIoDevicesPanel projectPublicId="proj-1" />, {
      apolloMocks: [
        projectIoDevices([apc]),
        availableIoDevices([]),
        activeStates([{ ...apc, status: IoDeviceStatus.Ambiguous }]),
      ],
    });

    const row = (await screen.findByText('Ambiguous: identical devices on other USB ports')).closest('tr');
    expect(row && within(row).getByText('APC mini mk2')).toBeInTheDocument();
  });

  it('GIVEN saving fails WHEN a checkbox is toggled THEN the list stays unchanged', async () => {
    const { user } = renderWithProviders(<ProjectIoDevicesPanel projectPublicId="proj-1" />, {
      apolloMocks: [
        projectIoDevices([]),
        availableIoDevices([apc]),
        activeStates([]),
        {
          request: {
            query: UpdateProjectIoDevicesDocument,
            variables: { input: { publicId: 'proj-1', ioDevices: [apc] } },
          },
          error: new Error('Project not found'),
        },
      ],
    });

    const checkbox = await screen.findByRole('checkbox', { name: 'Use APC mini mk2 in this project' });
    await user.click(checkbox);

    expect(checkbox).not.toBeChecked();
  });
});
