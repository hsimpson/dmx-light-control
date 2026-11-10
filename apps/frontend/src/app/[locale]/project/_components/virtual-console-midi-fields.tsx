'use client';

import MidiFeedbackFields from '@/app/[locale]/midiMapping/_components/midi-feedback-fields';
import { paletteFor } from '@/app/[locale]/midiMapping/_components/midi-led-palettes';
import {
  feedbackValues,
  learnedAddress,
  midiAddress,
} from '@/app/[locale]/midiMapping/_components/midi-mapping-entry-values';
import { ICON_SIZE } from '@/lib/constants';
import { DmxSocketConnector } from '@/lib/dmx/dmx-socket-connector';
import { dmxStore } from '@/lib/dmx/dmx-store';
import { useTranslation } from '@/lib/i18n/use-translation';
import {
  ActiveIoDeviceStatesDocument,
  GetMidiMappingsDocument,
  GetProjectIoDevicesDocument,
  IoDeviceKind,
  type ActiveIoDeviceStatesQuery,
  type GetMidiMappingsQuery,
  type IoDeviceFieldsFragment,
} from '@/shared/types/graphql/graphql';
import { useQuery } from '@apollo/client/react';
import { Button, Group, MultiSelect, Select, Stack, Switch } from '@mantine/core';
import { BroadcastIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import type { VirtualConsoleControl } from './virtual-console-document';

type VirtualConsoleMidiFieldsProperties = {
  projectPublicId: string;
  control: VirtualConsoleControl;
  onPatch: (patch: Partial<VirtualConsoleControl>) => void;
};

type MidiMappings = GetMidiMappingsQuery['midiMappings'];
type MidiSender = ActiveIoDeviceStatesQuery['ioDevices'][number];

/** The units a control on this mapping can be limited to; a unit needs a serial to be told apart. */
function unitOptions(devices: readonly IoDeviceFieldsFragment[], mappingPublicId: string | null | undefined) {
  const options = devices.flatMap(device =>
    device.serial && device.midiMappingPublicId === mappingPublicId
      ? [{ value: device.serial, label: device.customName ?? `${device.name} (${device.serial})` }]
      : [],
  );
  // Mantine throws on duplicate option values.
  return options.filter((option, index) => options.findIndex(other => other.value === option.value) === index);
}

function findLearnedEntry(message: number[], sender: MidiSender | undefined, mappings: MidiMappings) {
  const address = learnedAddress(message);
  const entries = mappings.find(mapping => mapping.publicId === sender?.midiMappingPublicId)?.entries;
  return address
    ? entries?.find(
        e => e.messageType === address.messageType && e.channel === address.channel && e.number === address.number,
      )
    : undefined;
}

/** Binds a button/slider to an entry of the mappings assigned to this project's MIDI controllers. */
const VirtualConsoleMidiFields = ({ projectPublicId, control, onPatch }: VirtualConsoleMidiFieldsProperties) => {
  const { t } = useTranslation();
  const { data: devicesData } = useQuery(GetProjectIoDevicesDocument, { variables: { publicId: projectPublicId } });
  const { data: mappingsData } = useQuery(GetMidiMappingsDocument);
  const midiDevices = (devicesData?.project?.ioDevices ?? []).filter(device => device.kind === IoDeviceKind.Midi);
  const assigned = new Set(midiDevices.map(device => device.midiMappingPublicId));
  const mappings = (mappingsData?.midiMappings ?? []).filter(mapping => assigned.has(mapping.publicId));
  const entryMapping = mappings.find(mapping => mapping.entries.some(e => e.publicId === control.midiEntryPublicId));
  const entry = entryMapping?.entries.find(e => e.publicId === control.midiEntryPublicId);
  const scope = control.midiDeviceSerials ?? [];
  const mappingUnits = unitOptions(midiDevices, entryMapping?.publicId);
  // A scope can name a unit that left the mapping; it must stay visible so it can be removed.
  const units = [
    ...mappingUnits,
    ...scope
      .filter(serial => !mappingUnits.some(unit => unit.value === serial))
      .map(serial => ({ value: serial, label: serial })),
  ];
  const [learning, setLearning] = useState(false);
  const { data: statesData } = useQuery(ActiveIoDeviceStatesDocument, {
    skip: !learning,
    fetchPolicy: 'network-only',
  });
  const senders = statesData?.ioDevices;

  useEffect(() => {
    if (!learning) {
      return undefined;
    }
    return dmxStore.subscribe((state, previous) => {
      const input = state.lastMidiInput;
      if (!input || input === previous.lastMidiInput) {
        return;
      }
      const sender = senders?.find(device => device.handle === input.portName);
      const learned = findLearnedEntry(input.message, sender, mappings);
      if (learned) {
        const shared = unitOptions(midiDevices, sender?.midiMappingPublicId).length > 1;
        onPatch({
          midiEntryPublicId: learned.publicId,
          midiDeviceSerials: shared && sender?.serial ? [sender.serial] : undefined,
        });
        setLearning(false);
      }
    });
  }, [learning, mappings, midiDevices, onPatch, senders]);

  const pickEntry = (value: string | null) => {
    if (!value) {
      onPatch({ midiEntryPublicId: undefined, midiDeviceSerials: undefined, feedback: undefined });
    } else if (entryMapping?.entries.some(e => e.publicId === value)) {
      onPatch({ midiEntryPublicId: value });
    } else {
      // A scope names units of the previous mapping, which may not use the new one.
      onPatch({ midiEntryPublicId: value, midiDeviceSerials: undefined });
    }
  };

  return (
    <Stack gap="xs">
      <DmxSocketConnector />
      <Group align="flex-end" wrap="nowrap" gap="xs">
        <Select
          flex={1}
          clearable
          searchable
          label={t({ id: 'ProjectDetail.virtualConsole.midiInput', defaultMessage: 'MIDI input' })}
          placeholder={t({ id: 'ProjectDetail.virtualConsole.noMidiInput', defaultMessage: 'None' })}
          nothingFoundMessage={t({
            id: 'ProjectDetail.virtualConsole.noMidiMapping',
            defaultMessage: 'Assign a MIDI mapping to a controller on the IO tab first',
          })}
          data={mappings.map(mapping => ({
            group: mapping.name,
            items: mapping.entries.map(item => ({
              value: item.publicId,
              label: `${item.name} (${midiAddress(item)})`,
            })),
          }))}
          value={control.midiEntryPublicId ?? null}
          onChange={pickEntry}
        />
        <Button
          flex="none"
          variant={learning ? 'filled' : 'light'}
          leftSection={<BroadcastIcon size={ICON_SIZE} weight="duotone" />}
          onClick={() => {
            setLearning(current => !current);
          }}
        >
          {learning
            ? t({ id: 'MidiMappingEntry.learning', defaultMessage: 'Press a control…' })
            : t({ id: 'MidiMappingEntry.learn', defaultMessage: 'Learn' })}
        </Button>
      </Group>
      {control.midiEntryPublicId && (units.length > 1 || scope.length > 0) ? (
        <MultiSelect
          label={t({ id: 'ProjectDetail.virtualConsole.midiDevices', defaultMessage: 'MIDI controllers' })}
          placeholder={t({ id: 'ProjectDetail.virtualConsole.midiDevicesAll', defaultMessage: 'All controllers' })}
          data={units}
          value={scope}
          onChange={serials => {
            onPatch({ midiDeviceSerials: serials.length > 0 ? serials : undefined });
          }}
        />
      ) : null}
      {control.midiEntryPublicId ? (
        <Switch
          label={t({ id: 'ProjectDetail.virtualConsole.feedbackOverride', defaultMessage: 'Own LED feedback' })}
          checked={Boolean(control.feedback)}
          onChange={event => {
            onPatch({ feedback: event.currentTarget.checked ? feedbackValues(entry?.feedback) : undefined });
          }}
        />
      ) : null}
      {control.midiEntryPublicId && control.feedback ? (
        <MidiFeedbackFields
          palette={paletteFor(entryMapping?.ledPalettes, entry?.ledType)}
          value={feedbackValues(control.feedback)}
          onChange={feedback => {
            onPatch({ feedback });
          }}
        />
      ) : null}
    </Stack>
  );
};

export default VirtualConsoleMidiFields;
