'use client';

import { ICON_SIZE } from '@/lib/constants';
import { DmxSocketConnector } from '@/lib/dmx/dmx-socket-connector';
import { dmxStore } from '@/lib/dmx/dmx-store';
import { globalMessages } from '@/lib/i18n/global-messages';
import { useTranslation } from '@/lib/i18n/use-translation';
import { MidiControlType, MidiMessageType, type MidiMappingEntryFieldsFragment } from '@/shared/types/graphql/graphql';
import { Button, Group, Modal, NumberInput, Select, SimpleGrid, Stack, Switch, Text, TextInput } from '@mantine/core';
import { BroadcastIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import MidiFeedbackFields from './midi-feedback-fields';
import {
  applyLearned,
  entryInput,
  entryValues,
  learnedAddress,
  type MidiMappingEntryInput,
  type MidiMappingEntryValues,
} from './midi-mapping-entry-values';

const CONTROL_TYPES = [MidiControlType.Button, MidiControlType.Knob, MidiControlType.Slider];
const MESSAGE_TYPES = [MidiMessageType.Note, MidiMessageType.ControlChange];

type MidiMappingEntryModalProperties = {
  entry: MidiMappingEntryFieldsFragment | undefined;
  saving: boolean;
  onClose: () => void;
  onSubmit: (input: MidiMappingEntryInput) => void;
};

const MidiMappingEntryModal = ({ entry, saving, onClose, onSubmit }: MidiMappingEntryModalProperties) => {
  const { t } = useTranslation();
  const [values, setValues] = useState<MidiMappingEntryValues>(() => entryValues(entry));
  const [learning, setLearning] = useState(false);
  const patch = (changes: Partial<MidiMappingEntryValues>) => {
    setValues(current => ({ ...current, ...changes }));
  };

  useEffect(() => {
    if (!learning) {
      return undefined;
    }
    return dmxStore.subscribe((state, previous) => {
      const address =
        state.lastMidiInput !== previous.lastMidiInput && state.lastMidiInput
          ? learnedAddress(state.lastMidiInput.message)
          : undefined;
      if (address) {
        setValues(current => applyLearned(current, address));
        setLearning(false);
      }
    });
  }, [learning]);

  const title = entry
    ? t({ id: 'MidiMappingEntry.edit', defaultMessage: 'Edit control' })
    : t({ id: 'MidiMappingEntry.add', defaultMessage: 'Add control' });

  return (
    <Modal opened onClose={onClose} title={title} centered size="lg">
      <Stack>
        <TextInput
          data-autofocus
          label={t({ id: 'MidiMappingEntry.name', defaultMessage: 'Name' })}
          value={values.name}
          onChange={event => {
            patch({ name: event.currentTarget.value });
          }}
        />
        <DmxSocketConnector />
        <Group wrap="nowrap">
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
          <Text size="sm" c="dimmed">
            {t({
              id: 'MidiMappingEntry.learnHint',
              defaultMessage:
                'Captures the next button press or fader move. The controller must be in the active project.',
            })}
          </Text>
        </Group>
        <SimpleGrid cols={2}>
          <Select
            label={t({ id: 'MidiMappingEntry.controlType', defaultMessage: 'Type' })}
            allowDeselect={false}
            data={[
              { value: MidiControlType.Button, label: t({ id: 'MidiMappingEntry.button', defaultMessage: 'Button' }) },
              { value: MidiControlType.Knob, label: t({ id: 'MidiMappingEntry.knob', defaultMessage: 'Knob' }) },
              { value: MidiControlType.Slider, label: t({ id: 'MidiMappingEntry.slider', defaultMessage: 'Slider' }) },
            ]}
            value={values.controlType}
            onChange={value => {
              const controlType = CONTROL_TYPES.find(type => type === value);
              if (controlType) {
                patch({ controlType });
              }
            }}
          />
          <Select
            label={t({ id: 'MidiMappingEntry.messageType', defaultMessage: 'MIDI message' })}
            allowDeselect={false}
            data={[
              { value: MidiMessageType.Note, label: 'Note' },
              { value: MidiMessageType.ControlChange, label: 'Control Change' },
            ]}
            value={values.messageType}
            onChange={value => {
              const messageType = MESSAGE_TYPES.find(type => type === value);
              if (messageType) {
                patch({ messageType });
              }
            }}
          />
          <NumberInput
            label={t({ id: 'MidiMappingEntry.channel', defaultMessage: 'Channel (0-15)' })}
            min={0}
            max={15}
            allowDecimal={false}
            clampBehavior="strict"
            value={values.channel}
            onChange={value => {
              patch({ channel: Number(value) });
            }}
          />
          <NumberInput
            label={t({ id: 'MidiMappingEntry.number', defaultMessage: 'Note / controller (0-127)' })}
            min={0}
            max={127}
            allowDecimal={false}
            clampBehavior="strict"
            value={values.number}
            onChange={value => {
              patch({ number: Number(value) });
            }}
          />
        </SimpleGrid>
        <Switch
          label={t({ id: 'MidiMappingEntry.hasFeedback', defaultMessage: 'LED feedback' })}
          checked={values.hasFeedback}
          onChange={event => {
            patch({ hasFeedback: event.currentTarget.checked });
          }}
        />
        {values.hasFeedback ? (
          <>
            <Text size="sm" c="dimmed">
              {t({
                id: 'MidiMappingEntry.feedbackHint',
                defaultMessage:
                  'Sent as Note-On to the same note: the behavior is the MIDI channel, the color the velocity.',
              })}
            </Text>
            <MidiFeedbackFields
              value={values.feedback}
              onChange={feedback => {
                patch({ feedback });
              }}
            />
          </>
        ) : null}
        <Group justify="space-between">
          <Button variant="default" onClick={onClose}>
            {t(globalMessages.cancel)}
          </Button>
          <Button
            loading={saving}
            disabled={!values.name.trim()}
            onClick={() => {
              onSubmit(entryInput(values));
            }}
          >
            {t(globalMessages.save)}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default MidiMappingEntryModal;
