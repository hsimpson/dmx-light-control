'use client';

import MidiFeedbackFields from '@/app/[locale]/midiMapping/_components/midi-feedback-fields';
import { feedbackValues, midiAddress } from '@/app/[locale]/midiMapping/_components/midi-mapping-entry-values';
import { useTranslation } from '@/lib/i18n/use-translation';
import { GetMidiMappingsDocument, GetProjectIoDevicesDocument, IoDeviceKind } from '@/shared/types/graphql/graphql';
import { useQuery } from '@apollo/client/react';
import { Select, Stack, Switch } from '@mantine/core';
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
  const entry = mappings.flatMap(mapping => mapping.entries).find(e => e.publicId === control.midiEntryPublicId);

  return (
    <Stack gap="xs">
      <Select
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
          items: mapping.entries.map(item => ({ value: item.publicId, label: `${item.name} (${midiAddress(item)})` })),
        }))}
        value={control.midiEntryPublicId ?? null}
        onChange={value => {
          onPatch(value ? { midiEntryPublicId: value } : { midiEntryPublicId: undefined, feedback: undefined });
        }}
      />
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
