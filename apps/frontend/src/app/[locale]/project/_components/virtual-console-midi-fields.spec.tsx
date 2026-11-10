import { dmxStore, resetDmxStore } from '@/lib/dmx/dmx-store';
import {
  ActiveIoDeviceStatesDocument,
  GetMidiMappingsDocument,
  GetProjectIoDevicesDocument,
  IoDeviceKind,
  IoDeviceStatus,
  MidiControlType,
  MidiLedType,
  MidiMessageType,
} from '@/shared/types/graphql/graphql';
import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { act, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createControl, type VirtualConsoleControl } from './virtual-console-document';
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
  ledType: MidiLedType.Rgb,
});
const mapping = (publicId: string, name: string, entries: ReturnType<typeof mappingEntry>[]) => ({
  __typename: 'MidiMappingDto' as const,
  publicId,
  name,
  createdAt: now,
  updatedAt: now,
  ledPalettes: {
    __typename: 'MidiLedPalettesDto' as const,
    rgb: {
      __typename: 'MidiLedPaletteDto' as const,
      behaviors: [{ __typename: 'MidiLedOptionDto' as const, name: 'Solid 100 %', value: 6, hex: null }],
      colors: [{ __typename: 'MidiLedOptionDto' as const, name: 'Red', value: 5, hex: '#FF0000' }],
    },
    single: null,
  },
  entries,
});

const UPLIGHTS = '25082560709810';
const T_BARS = '26062560878750';

type Unit = {
  serial: string | null;
  customName: string | null;
  midiMappingPublicId: string;
  handle: string;
};

const uplights: Unit = { serial: UPLIGHTS, customName: 'Uplights', midiMappingPublicId: 'midi-1', handle: 'APC 28:0' };
const tBars: Unit = { serial: T_BARS, customName: 'T-Bars', midiMappingPublicId: 'midi-1', handle: 'APC 32:0' };
const unnamedUnit: Unit = { serial: null, customName: null, midiMappingPublicId: 'midi-1', handle: 'APC' };

const identity = ({ serial }: Unit) => ({
  kind: IoDeviceKind.Midi,
  name: 'APC mini mk2',
  manufacturer: null,
  serial,
  vendorId: null,
  productId: null,
  usbLocation: null,
});

const mappingsMock = (assigned: ReturnType<typeof mapping>[] = []) => ({
  request: { query: GetMidiMappingsDocument },
  result: {
    data: {
      midiMappings: [
        mapping('midi-1', 'APC mini mk2', [mappingEntry('pad-1', 'Pad 1', 0), mappingEntry('pad-2', 'Pad 2', 2)]),
        mapping('midi-2', 'Unused controller', [mappingEntry('other', 'Other pad', 1)]),
        ...assigned,
      ],
    },
  },
});

const mocksFor = (units: Unit[], assigned: ReturnType<typeof mapping>[] = []) => [
  {
    request: { query: GetProjectIoDevicesDocument, variables: { publicId: 'proj-1' } },
    result: {
      data: {
        project: {
          __typename: 'ProjectDto' as const,
          publicId: 'proj-1',
          ioDevices: units.map(unit => ({
            __typename: 'IoDeviceDto' as const,
            ...identity(unit),
            customName: unit.customName,
            midiMappingPublicId: unit.midiMappingPublicId,
            audioChannels: null,
            maxInputChannels: null,
          })),
        },
      },
    },
  },
  mappingsMock(assigned),
  {
    request: { query: ActiveIoDeviceStatesDocument },
    result: {
      data: {
        ioDevices: units.map(unit => ({
          __typename: 'IoDeviceStateDto' as const,
          ...identity(unit),
          midiMappingPublicId: unit.midiMappingPublicId,
          status: IoDeviceStatus.Connected,
          handle: unit.handle,
        })),
      },
    },
  },
];

const mocks = mocksFor([unnamedUnit]);

const flushQueries = async () => {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 20));
  });
};

const press = (portName: string, message: number[]) => {
  act(() => {
    dmxStore.getState().setLastMidiInput({ portName, message });
  });
};

describe('VirtualConsoleMidiFields', () => {
  afterEach(() => {
    resetDmxStore();
  });

  it('GIVEN learn is active WHEN a mapped pad is pressed THEN the control is bound to its entry', async () => {
    const onPatch = vi.fn();
    const { user } = renderWithProviders(
      <VirtualConsoleMidiFields projectPublicId="proj-1" control={createControl('button', 0, 0)} onPatch={onPatch} />,
      { apolloMocks: mocks },
    );
    await screen.findByRole('combobox', { name: 'MIDI input' });

    await user.click(screen.getByRole('button', { name: 'Learn' }));
    await flushQueries();
    press('APC', [0x90, 1, 0x7f]);
    expect(onPatch).not.toHaveBeenCalled();

    press('APC', [0x90, 0, 0x7f]);
    expect(onPatch).toHaveBeenCalledWith({ midiEntryPublicId: 'pad-1' });
    expect(screen.getByRole('button', { name: 'Learn' })).toBeInTheDocument();
  });

  describe('two units sharing one mapping', () => {
    const openUnitSelector = () => screen.getByLabelText('MIDI controllers', { selector: 'input' });

    beforeAll(() => {
      // jsdom has no layout; Mantine scrolls the active option into view.
      Element.prototype.scrollIntoView = vi.fn<() => void>();
    });

    const renderFields = async (
      units: Unit[],
      control: VirtualConsoleControl = createControl('button', 0, 0),
      assigned: ReturnType<typeof mapping>[] = [],
    ) => {
      const onPatch = vi.fn<(patch: Partial<VirtualConsoleControl>) => void>();
      const { user } = renderWithProviders(
        <VirtualConsoleMidiFields projectPublicId="proj-1" control={control} onPatch={onPatch} />,
        { apolloMocks: mocksFor(units, assigned) },
      );
      await screen.findByRole('combobox', { name: 'MIDI input' });
      await flushQueries();
      return { onPatch, user };
    };
    const bound: VirtualConsoleControl = { ...createControl('button', 0, 0), midiEntryPublicId: 'pad-1' };

    it('GIVEN learn is active WHEN one unit is pressed THEN the control is bound to that unit only', async () => {
      const { onPatch, user } = await renderFields([uplights, tBars]);

      await user.click(screen.getByRole('button', { name: 'Learn' }));
      await flushQueries();
      press(tBars.handle, [0x90, 0, 0x7f]);

      expect(onPatch).toHaveBeenCalledWith({ midiEntryPublicId: 'pad-1', midiDeviceSerials: [T_BARS] });
    });

    it('GIVEN learn is active WHEN an unknown port sends THEN it keeps listening', async () => {
      const { onPatch, user } = await renderFields([uplights, tBars]);

      await user.click(screen.getByRole('button', { name: 'Learn' }));
      await flushQueries();
      press('Other 40:0', [0x90, 0, 0x7f]);

      expect(onPatch).not.toHaveBeenCalled();
      press(uplights.handle, [0x90, 0, 0x7f]);
      expect(onPatch).toHaveBeenCalledWith({ midiEntryPublicId: 'pad-1', midiDeviceSerials: [UPLIGHTS] });
    });

    it('GIVEN learn is active WHEN the only unit on the mapping is pressed THEN the control stays unscoped', async () => {
      const { onPatch, user } = await renderFields([uplights]);

      await user.click(screen.getByRole('button', { name: 'Learn' }));
      await flushQueries();
      press(uplights.handle, [0x90, 0, 0x7f]);

      await waitFor(() => {
        expect(onPatch).toHaveBeenCalledTimes(1);
      });
      expect(onPatch.mock.calls[0]?.[0]?.midiDeviceSerials).toBeUndefined();
    });

    it('GIVEN units on different mappings WHEN learning THEN the address is looked up in the pressed unit`s mapping', async () => {
      const other = { ...tBars, midiMappingPublicId: 'midi-3' };
      const { onPatch, user } = await renderFields([uplights, other], createControl('button', 0, 0), [
        mapping('midi-3', 'Second', [mappingEntry('second-pad', 'Second pad', 0)]),
      ]);

      await user.click(screen.getByRole('button', { name: 'Learn' }));
      await flushQueries();
      press(other.handle, [0x90, 0, 0x7f]);

      expect(onPatch.mock.calls[0]?.[0]?.midiEntryPublicId).toBe('second-pad');
    });

    it('GIVEN a bound control WHEN another unit is picked THEN the scope lists it, by custom name', async () => {
      const { onPatch, user } = await renderFields([uplights, tBars], {
        ...bound,
        midiDeviceSerials: [UPLIGHTS],
      });

      await user.click(openUnitSelector());
      await user.click(await screen.findByRole('option', { name: 'T-Bars', hidden: true }));

      expect(onPatch).toHaveBeenCalledWith({ midiDeviceSerials: [UPLIGHTS, T_BARS] });
    });

    it('GIVEN the last unit is removed from the scope WHEN changed THEN the scope is cleared', async () => {
      const { onPatch, user } = await renderFields([uplights, tBars], {
        ...bound,
        midiDeviceSerials: [UPLIGHTS],
      });

      await user.click(openUnitSelector());
      await user.click(await screen.findByRole('option', { name: 'Uplights', hidden: true }));

      expect(onPatch.mock.calls[0]?.[0]).toHaveProperty('midiDeviceSerials', undefined);
    });

    it('GIVEN units without a custom name WHEN listed THEN the option shows name and serial', async () => {
      const { user } = await renderFields(
        [
          { ...uplights, customName: null },
          { ...tBars, customName: null },
        ],
        bound,
      );

      await user.click(openUnitSelector());

      expect(await screen.findByRole('option', { name: `APC mini mk2 (${T_BARS})`, hidden: true })).toBeInTheDocument();
    });

    it('GIVEN a scope naming a unit that left the mapping WHEN opened THEN it is listed and can be removed', async () => {
      const { onPatch, user } = await renderFields([uplights], { ...bound, midiDeviceSerials: [T_BARS] });

      await user.click(openUnitSelector());
      await user.click(await screen.findByRole('option', { name: T_BARS, hidden: true }));

      expect(onPatch.mock.calls[0]?.[0]).toHaveProperty('midiDeviceSerials', undefined);
    });

    it('GIVEN a single unit on the mapping WHEN bound THEN there is no unit selector', async () => {
      await renderFields([uplights], bound);

      expect(screen.queryByLabelText('MIDI controllers')).not.toBeInTheDocument();
    });

    it('GIVEN two units reporting the same serial WHEN bound THEN there is no unit selector', async () => {
      await renderFields([uplights, { ...tBars, serial: UPLIGHTS }], bound);

      expect(screen.queryByLabelText('MIDI controllers')).not.toBeInTheDocument();
    });

    it('GIVEN a scoped control WHEN an entry of the same mapping is picked THEN the scope stays', async () => {
      const { onPatch, user } = await renderFields([uplights, tBars], { ...bound, midiDeviceSerials: [UPLIGHTS] });

      await user.click(screen.getByRole('combobox', { name: 'MIDI input' }));
      await user.click(await screen.findByRole('option', { name: 'Pad 2 (Note 0 / 2)', hidden: true }));

      expect(onPatch.mock.calls[0]?.[0]).toEqual({ midiEntryPublicId: 'pad-2' });
      expect(onPatch.mock.calls[0]?.[0]).not.toHaveProperty('midiDeviceSerials');
    });

    it('GIVEN a scoped control WHEN an entry of another mapping is picked THEN the scope is cleared', async () => {
      const other = { ...tBars, midiMappingPublicId: 'midi-3' };
      const { onPatch, user } = await renderFields([uplights, other], { ...bound, midiDeviceSerials: [UPLIGHTS] }, [
        mapping('midi-3', 'Second', [mappingEntry('second-pad', 'Second pad', 0)]),
      ]);

      await user.click(screen.getByRole('combobox', { name: 'MIDI input' }));
      await user.click(await screen.findByRole('option', { name: 'Second pad (Note 0 / 0)', hidden: true }));

      expect(onPatch.mock.calls[0]?.[0]).toHaveProperty('midiDeviceSerials', undefined);
      expect(onPatch.mock.calls[0]?.[0]?.midiEntryPublicId).toBe('second-pad');
    });
  });

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

    expect(await screen.findByRole('combobox', { name: 'On: Color (velocity 0-127)' })).toHaveValue('Red');
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

    expect(onPatch.mock.calls[0]?.[0]).toHaveProperty('midiEntryPublicId', undefined);
    expect(onPatch.mock.calls[0]?.[0]).toHaveProperty('midiDeviceSerials', undefined);
    expect(onPatch.mock.calls[0]?.[0]).toHaveProperty('feedback', undefined);
  });
});
