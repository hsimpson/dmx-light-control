import {
  ActiveIoDeviceStatesDocument,
  AvailableIoDevicesDocument,
  GetMidiMappingsDocument,
  GetProjectIoDevicesDocument,
  IoDeviceKind,
  IoDeviceStatus,
  UpdateProjectIoDevicesDocument,
} from '@/shared/types/graphql/graphql';
import { dmxStore, resetDmxStore } from '@/lib/dmx/dmx-store';
import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { act, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
  usbLocation: '3-10' as string | null,
  customName: null as string | null,
  midiMappingPublicId: null as string | null,
  audioChannels: null as number | null,
};

const apc = {
  kind: IoDeviceKind.Midi,
  name: 'APC mini mk2',
  manufacturer: 'AKAI professional',
  serial: 'Ver00.10',
  vendorId: '09e8',
  productId: '004f',
  usbLocation: '3-9',
  customName: null as string | null,
  midiMappingPublicId: null as string | null,
  audioChannels: null as number | null,
};

const mic = {
  kind: IoDeviceKind.SoundInput,
  name: 'StreamCam',
  manufacturer: null as string | null,
  serial: null as string | null,
  vendorId: null as string | null,
  productId: null as string | null,
  usbLocation: null as string | null,
  customName: null as string | null,
  midiMappingPublicId: null as string | null,
  audioChannels: null as number | null,
};

const asDto = (device: typeof ftdi) => ({
  __typename: 'IoDeviceDto' as const,
  ...device,
  maxInputChannels: device.kind === IoDeviceKind.SoundInput ? 2 : null,
});

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
  result: {
    data: {
      ioDevices: states.map(({ customName: _customName, audioChannels: _channels, ...state }) => ({
        __typename: 'IoDeviceStateDto' as const,
        ...state,
        handle: null,
      })),
    },
  },
});

const midiMappings = {
  request: { query: GetMidiMappingsDocument },
  result: {
    data: {
      midiMappings: [
        {
          __typename: 'MidiMappingDto' as const,
          publicId: 'midi-1',
          name: 'APC mini mk2',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          entries: [],
        },
      ],
    },
  },
};

const saveMock = (devices: (typeof ftdi)[]) => {
  const result = vi.fn(() => ({
    data: {
      updateProjectIoDevices: { __typename: 'ProjectDto' as const, publicId: 'proj-1', ioDevices: devices.map(asDto) },
    },
  }));
  return {
    result,
    mock: {
      request: {
        query: UpdateProjectIoDevicesDocument,
        variables: { input: { publicId: 'proj-1', ioDevices: devices } },
      },
      result,
    },
  };
};

describe('ProjectIoDevicesPanel', () => {
  afterEach(() => {
    resetDmxStore();
  });

  it('GIVEN a configured sound input WHEN another one is picked THEN it replaces the first in mono', async () => {
    const lineIn = { ...mic, name: 'Line In' };
    const save = saveMock([ftdi, { ...lineIn, audioChannels: 1 }]);
    const { user } = renderWithProviders(<ProjectIoDevicesPanel projectPublicId="proj-1" />, {
      apolloMocks: [
        projectIoDevices([ftdi, { ...mic, audioChannels: 2 }]),
        availableIoDevices([mic, lineIn]),
        activeStates([]),
        save.mock,
        projectIoDevices([ftdi, { ...lineIn, audioChannels: 1 }]),
        activeStates([]),
      ],
    });

    await user.click(await screen.findByRole('checkbox', { name: 'Use Line In in this project' }));

    await waitFor(() => {
      expect(save.result).toHaveBeenCalledTimes(1);
    });
  });

  it('GIVEN a configured mono sound input WHEN Stereo is picked THEN it is saved with 2 channels', async () => {
    const save = saveMock([{ ...mic, audioChannels: 2 }]);
    const { user } = renderWithProviders(<ProjectIoDevicesPanel projectPublicId="proj-1" />, {
      apolloMocks: [
        projectIoDevices([{ ...mic, audioChannels: 1 }]),
        availableIoDevices([mic]),
        activeStates([]),
        save.mock,
        projectIoDevices([{ ...mic, audioChannels: 2 }]),
        activeStates([]),
      ],
    });

    await user.click(await screen.findByText('Stereo'));

    await waitFor(() => {
      expect(save.result).toHaveBeenCalledTimes(1);
    });
  });

  it('GIVEN a connected stereo sound input WHEN levels arrive THEN a meter per channel shows them', async () => {
    const stereo = { ...mic, audioChannels: 2 };
    renderWithProviders(<ProjectIoDevicesPanel projectPublicId="proj-1" />, {
      apolloMocks: [
        projectIoDevices([stereo]),
        availableIoDevices([]),
        activeStates([{ ...stereo, status: IoDeviceStatus.Connected }]),
      ],
    });

    const left = await screen.findByRole('progressbar', { name: 'Left input level of StreamCam' });
    act(() => {
      dmxStore.getState().setSoundLevels([1, 0]);
    });

    expect(left).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByRole('progressbar', { name: 'Right input level of StreamCam' })).toHaveAttribute(
      'aria-valuenow',
      '0',
    );
  });

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
      expect(screen.getAllByText('No devices connected or configured')).toHaveLength(3);
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

  describe('custom name', () => {
    const NAME_FIELD = 'Custom name of APC mini mk2';

    it('GIVEN a configured controller WHEN a name is entered and the field left THEN it is saved', async () => {
      const save = saveMock([{ ...apc, customName: 'APC left' }]);
      const { user } = renderWithProviders(<ProjectIoDevicesPanel projectPublicId="proj-1" />, {
        apolloMocks: [
          projectIoDevices([apc]),
          availableIoDevices([]),
          activeStates([]),
          save.mock,
          projectIoDevices([{ ...apc, customName: 'APC left' }]),
          activeStates([]),
        ],
      });

      await user.type(await screen.findByRole('textbox', { name: NAME_FIELD }), '  APC left ');
      await user.tab();

      await waitFor(() => {
        expect(save.result).toHaveBeenCalledTimes(1);
      });
      expect(await screen.findByDisplayValue('APC left')).toBeInTheDocument();
    });

    it('GIVEN a named controller WHEN the name is cleared THEN null is saved', async () => {
      const save = saveMock([apc]);
      const { user } = renderWithProviders(<ProjectIoDevicesPanel projectPublicId="proj-1" />, {
        apolloMocks: [
          projectIoDevices([{ ...apc, customName: 'APC left' }]),
          availableIoDevices([]),
          activeStates([]),
          save.mock,
          projectIoDevices([apc]),
          activeStates([]),
        ],
      });

      await user.clear(await screen.findByDisplayValue('APC left'));
      await user.tab();

      await waitFor(() => {
        expect(save.result).toHaveBeenCalledTimes(1);
      });
    });

    it('GIVEN a named controller WHEN the field is left unchanged THEN nothing is saved', async () => {
      const save = saveMock([{ ...apc, customName: 'APC left' }]);
      const { user } = renderWithProviders(<ProjectIoDevicesPanel projectPublicId="proj-1" />, {
        apolloMocks: [
          projectIoDevices([{ ...apc, customName: 'APC left' }]),
          availableIoDevices([]),
          activeStates([]),
          save.mock,
        ],
      });

      await user.click(await screen.findByDisplayValue('APC left'));
      await user.tab();

      expect(save.result).not.toHaveBeenCalled();
    });

    it('GIVEN an unused controller WHEN rendered THEN the name field is disabled and shows the device name', async () => {
      renderWithProviders(<ProjectIoDevicesPanel projectPublicId="proj-1" />, {
        apolloMocks: [projectIoDevices([]), availableIoDevices([apc]), activeStates([])],
      });

      const field = await screen.findByRole('textbox', { name: NAME_FIELD });

      expect(field).toBeDisabled();
      expect(field).toHaveAttribute('placeholder', 'APC mini mk2');
    });

    it('GIVEN a DMX output WHEN rendered THEN it has no name field', async () => {
      renderWithProviders(<ProjectIoDevicesPanel projectPublicId="proj-1" />, {
        apolloMocks: [projectIoDevices([ftdi]), availableIoDevices([]), activeStates([])],
      });

      await screen.findByRole('checkbox', { name: 'Use FT232R USB UART in this project' });

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
  });

  it('GIVEN a configured controller WHEN a MIDI mapping is picked THEN the device is saved with it', async () => {
    const assigned = { ...apc, midiMappingPublicId: 'midi-1' };
    const save = vi.fn(() => ({
      data: {
        updateProjectIoDevices: { __typename: 'ProjectDto' as const, publicId: 'proj-1', ioDevices: [asDto(assigned)] },
      },
    }));
    const { user } = renderWithProviders(<ProjectIoDevicesPanel projectPublicId="proj-1" />, {
      apolloMocks: [
        projectIoDevices([apc]),
        availableIoDevices([]),
        activeStates([]),
        midiMappings,
        {
          request: {
            query: UpdateProjectIoDevicesDocument,
            variables: { input: { publicId: 'proj-1', ioDevices: [assigned] } },
          },
          result: save,
        },
        projectIoDevices([assigned]),
        activeStates([]),
      ],
    });

    await user.click(await screen.findByRole('combobox', { name: 'MIDI mapping for APC mini mk2' }));
    await user.click(await screen.findByRole('option', { name: 'APC mini mk2', hidden: true }));

    await waitFor(() => {
      expect(save).toHaveBeenCalledTimes(1);
    });
  });
});
