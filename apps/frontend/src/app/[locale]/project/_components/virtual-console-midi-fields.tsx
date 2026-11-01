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
import { GetMidiMappingsDocument, GetProjectIoDevicesDocument, IoDeviceKind } from '@/shared/types/graphql/graphql';
import { useQuery } from '@apollo/client/react';
import { Button, Group, Select, Stack, Switch } from '@mantine/core';
import { BroadcastIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import type { VirtualConsoleControl } from './virtual-console-document';

type VirtualConsoleMidiFieldsProperties = {
  projectPublicId: string;
  control: VirtualConsoleControl;
  onPatch: (patch: Partial<VirtualConsoleControl>) => void;
};

/** Binds a button/slider to an entry of the mappings assigned to this project's MIDI controllers. */
const VirtualConsoleMidiFields = ({ projectPublicId, control, onPatch }: VirtualConsoleMidiFieldsProperties) => {
  const { t } = useTranslation();
  const { data: devicesData } = useQuery(GetProjectIoDevicesDocument, { variables: { publicId: projectPublicId } });
  const { data: mappingsData } = useQuery(GetMidiMappingsDocument);
  const assigned = new Set(
    (devicesData?.project?.ioDevices ?? []).flatMap(device =>
      device.kind === IoDeviceKind.Midi && device.midiMappingPublicId ? [device.midiMappingPublicId] : [],
    ),
  );
  const mappings = (mappingsData?.midiMappings ?? []).filter(mapping => assigned.has(mapping.publicId));
  const entryMapping = mappings.find(mapping => mapping.entries.some(e => e.publicId === control.midiEntryPublicId));
  const entry = entryMapping?.entries.find(e => e.publicId === control.midiEntryPublicId);
  const [learning, setLearning] = useState(false);

  useEffect(() => {
    if (!learning) {
      return undefined;
    }
    return dmxStore.subscribe((state, previous) => {
      const address =
        state.lastMidiInput !== previous.lastMidiInput && state.lastMidiInput
          ? learnedAddress(state.lastMidiInput.message)
          : undefined;
      // shortcut: first assigned mapping with this address wins, ignoring which port sent it; match by port if two controllers share addresses.
      const learned = address
        ? mappings
            .flatMap(mapping => mapping.entries)
            .find(
              e =>
                e.messageType === address.messageType && e.channel === address.channel && e.number === address.number,
            )
        : undefined;
      if (learned) {
        onPatch({ midiEntryPublicId: learned.publicId });
        setLearning(false);
      }
    });
  }, [learning, mappings, onPatch]);

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
          onChange={value => {
            onPatch(value ? { midiEntryPublicId: value } : { midiEntryPublicId: undefined, feedback: undefined });
          }}
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
