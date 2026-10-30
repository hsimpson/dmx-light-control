import {
  GetMidiMappingsDocument,
  GetProjectIoDevicesDocument,
  IoDeviceKind,
  MidiControlType,
  MidiMessageType,
} from '@/shared/types/graphql/graphql';
import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createControl } from './virtual-console-document';
import VirtualConsoleMidiFields from './virtual-console-midi-fields';

const now = new Date('2026-01-01T00:00:00.000Z');
const ledDefault = {
  __typename: 'MidiFeedbackDto' as const,
  off: { __typename: 'MidiLedStateDto' as const, behavior: 0, color: 0 },
  on: { __typename: 'MidiLedStateDto' as const, behavior: 6, color: 5 },
  monitor: null,
};
const mappingEntry = (publicId: string, name: string, number: number) => ({
  __typename: 'MidiMappingEntryDto' as const,
  publicId,
  name,
  controlType: MidiControlType.Button,
  messageType: MidiMessageType.Note,
  channel: 0,
  number,
  feedback: ledDefault,
});
const mapping = (publicId: string, name: string, entries: ReturnType<typeof mappingEntry>[]) => ({
  __typename: 'MidiMappingDto' as const,
  publicId,
  name,
  createdAt: now,
  updatedAt: now,
  entries,
});

const mocks = [
  {
    request: { query: GetProjectIoDevicesDocument, variables: { publicId: 'proj-1' } },
    result: {
      data: {
        project: {
          __typename: 'ProjectDto' as const,
          publicId: 'proj-1',
          ioDevices: [
            {
              __typename: 'IoDeviceDto' as const,
              kind: IoDeviceKind.Midi,
              name: 'APC mini mk2',
              manufacturer: null,
              serial: null,
              vendorId: null,
              productId: null,
              usbLocation: null,
              midiMappingPublicId: 'midi-1',
            },
          ],
        },
      },
    },
  },
  {
    request: { query: GetMidiMappingsDocument },
    result: {
      data: {
        midiMappings: [
          mapping('midi-1', 'APC mini mk2', [mappingEntry('pad-1', 'Pad 1', 0)]),
          mapping('midi-2', 'Unused controller', [mappingEntry('other', 'Other pad', 1)]),
        ],
      },
    },
  },
];

describe('VirtualConsoleMidiFields', () => {
  it('GIVEN mappings assigned to the project WHEN an entry is picked THEN the control is bound to it', async () => {
    const onPatch = vi.fn();
    const { user } = renderWithProviders(
      <VirtualConsoleMidiFields projectPublicId="proj-1" control={createControl('button', 0, 0)} onPatch={onPatch} />,
      { apolloMocks: mocks },
    );

    await user.click(await screen.findByRole('combobox', { name: 'MIDI input' }));

    expect(await screen.findByRole('option', { name: 'Pad 1 (Note 0 / 0)', hidden: true })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Other pad (Note 0 / 1)', hidden: true })).not.toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'Pad 1 (Note 0 / 0)', hidden: true }));
    expect(onPatch).toHaveBeenCalledWith({ midiEntryPublicId: 'pad-1' });
  });

  it('GIVEN a bound control WHEN its own feedback is switched on THEN it starts from the entry default', async () => {
    const onPatch = vi.fn();
    const control = { ...createControl('button', 0, 0), midiEntryPublicId: 'pad-1' };
    const { user } = renderWithProviders(
      <VirtualConsoleMidiFields projectPublicId="proj-1" control={control} onPatch={onPatch} />,
      { apolloMocks: mocks },
    );
    await screen.findByDisplayValue('Pad 1 (Note 0 / 0)');

    await user.click(screen.getByLabelText('Own LED feedback'));

    expect(onPatch).toHaveBeenCalledWith({
      feedback: { off: { behavior: 0, color: 0 }, on: { behavior: 6, color: 5 }, monitor: null },
    });
  });

  it('GIVEN a control with its own feedback WHEN the monitor state is enabled THEN it is added', async () => {
    const onPatch = vi.fn();
    const control = {
      ...createControl('button', 0, 0),
      midiEntryPublicId: 'pad-1',
      feedback: { off: { behavior: 0, color: 0 }, on: { behavior: 6, color: 5 } },
    };
    const { user } = renderWithProviders(
      <VirtualConsoleMidiFields projectPublicId="proj-1" control={control} onPatch={onPatch} />,
      { apolloMocks: mocks },
    );

    expect(screen.getByLabelText('On: Color (velocity 0-127)')).toHaveValue('5');
    await user.click(screen.getByLabelText('Monitor state: the function runs but was started elsewhere'));

    expect(onPatch).toHaveBeenCalledWith({
      feedback: { off: { behavior: 0, color: 0 }, on: { behavior: 6, color: 5 }, monitor: { behavior: 0, color: 1 } },
    });
  });

  it('GIVEN a bound control WHEN the input is cleared THEN binding and feedback are removed', async () => {
    const onPatch = vi.fn();
    const control = { ...createControl('slider', 0, 0), midiEntryPublicId: 'pad-1' };
    const { user } = renderWithProviders(
      <VirtualConsoleMidiFields projectPublicId="proj-1" control={control} onPatch={onPatch} />,
      { apolloMocks: mocks },
    );
    await screen.findByDisplayValue('Pad 1 (Note 0 / 0)');

    await user.click(screen.getByRole('button', { hidden: true, name: '' }));

    expect(onPatch).toHaveBeenCalledWith({ midiEntryPublicId: undefined, feedback: undefined });
  });
});
