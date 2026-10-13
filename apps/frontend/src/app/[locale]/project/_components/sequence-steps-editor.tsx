'use client';

import { useTranslation } from '@/lib/i18n/use-translation';
import { DragDropProvider } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { ActionIcon, Button, Group, NumberInput, Select, Stack, Text } from '@mantine/core';
import { DotsSixVerticalIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react';
import {
  absoluteDmxChannel,
  emptySequenceStep,
  firstUnusedAbsoluteChannel,
  fixtureForAbsoluteChannel,
  moveSequenceStep,
  newSequenceDmxValue,
  sortedSequenceFixtures,
  type SequenceFixtureChannel,
  type SequenceStepDraft,
} from './sequence-steps';

const sequenceSelectComboboxProps = {
  withinPortal: true,
  floatingStrategy: 'fixed' as const,
  position: 'bottom-start' as const,
  width: 'max-content' as const,
  zIndex: 400,
};

type SequenceStepsEditorProperties = {
  fixtures: SequenceFixtureChannel[];
  steps: SequenceStepDraft[];
  onChange: (steps: SequenceStepDraft[]) => void;
};

function isSortableSource(source: unknown): source is { initialIndex: number; index: number } {
  return (
    typeof source === 'object' &&
    source !== null &&
    'initialIndex' in source &&
    'index' in source &&
    typeof source.initialIndex === 'number' &&
    typeof source.index === 'number'
  );
}

const StepRow = ({
  fixtures,
  step,
  index,
  onChange,
  onRemove,
}: {
  fixtures: SequenceFixtureChannel[];
  step: SequenceStepDraft;
  index: number;
  onChange: (step: SequenceStepDraft) => void;
  onRemove: () => void;
}) => {
  const { t } = useTranslation();
  const { ref, handleRef } = useSortable({ id: step.key, index });
  const sortedFixtures = sortedSequenceFixtures(fixtures);
  const unavailableLabel = t({ id: 'ProjectDetail.virtualConsole.channelUnavailable', defaultMessage: 'Unavailable' });
  const replaceDmx = (entryIndex: number, channel: number, value: number) => {
    onChange({
      ...step,
      dmxValues: step.dmxValues.map((candidate, candidateIndex) =>
        candidateIndex === entryIndex ? { ...candidate, channel, value } : candidate,
      ),
    });
  };

  return (
    <Stack ref={ref} gap="xs" data-testid="sequence-step">
      <Group justify="space-between">
        <Group gap="xs">
          <ActionIcon
            ref={handleRef}
            variant="subtle"
            aria-label={t({ id: 'ProjectFunction.dragStep', defaultMessage: 'Drag step' })}
          >
            <DotsSixVerticalIcon />
          </ActionIcon>
          <Text fw={600}>
            {t({ id: 'ProjectFunction.step', defaultMessage: 'Step' })} {index + 1}
          </Text>
        </Group>
        <ActionIcon
          color="red"
          variant="subtle"
          aria-label={t({ id: 'ProjectFunction.removeStep', defaultMessage: 'Remove step' })}
          onClick={onRemove}
        >
          <TrashIcon />
        </ActionIcon>
      </Group>
      <Group grow>
        <NumberInput
          label={t({ id: 'ProjectFunction.fadeIn', defaultMessage: 'Fade in (ms)' })}
          min={0}
          value={step.fadeIn}
          onChange={value => {
            onChange({ ...step, fadeIn: Number(value) || 0 });
          }}
        />
        <NumberInput
          label={t({ id: 'ProjectFunction.hold', defaultMessage: 'Hold (ms)' })}
          min={0}
          value={step.hold}
          onChange={value => {
            onChange({ ...step, hold: Number(value) || 0 });
          }}
        />
        <NumberInput
          label={t({ id: 'ProjectFunction.fadeOut', defaultMessage: 'Fade out (ms)' })}
          min={0}
          value={step.fadeOut}
          onChange={value => {
            onChange({ ...step, fadeOut: Number(value) || 0 });
          }}
        />
      </Group>
      {step.dmxValues.map((entry, entryIndex) => {
        const usedByOthers = new Set(
          step.dmxValues
            .filter((_, candidateIndex) => candidateIndex !== entryIndex)
            .map(candidate => candidate.channel),
        );
        const owner = fixtureForAbsoluteChannel(sortedFixtures, entry.channel);
        const unmatchedValue = `unmatched:${entry.key}`;
        const fixtureData = [
          ...sortedFixtures.map((fixture, fixtureIndex) => ({
            value: fixture.publicId,
            label: `${fixture.name} [${fixtureIndex + 1}]`,
          })),
          ...(owner ? [] : [{ value: unmatchedValue, label: `${unavailableLabel} ${entry.channel}` }]),
        ];
        const channelSource = owner?.channels ?? [];
        const channelData = [...channelSource]
          .sort((left, right) => left.channelNumber - right.channelNumber)
          .filter(channel => {
            const absolute = absoluteDmxChannel(owner?.startAddress ?? 0, channel.channelNumber);
            return absolute === entry.channel || !usedByOthers.has(absolute);
          })
          .map(channel => {
            const absolute = absoluteDmxChannel(owner?.startAddress ?? 0, channel.channelNumber);
            return { value: String(absolute), label: `${absolute} · ${channel.name}` };
          });
        const channelOptions =
          channelData.length > 0 ? channelData : [{ value: String(entry.channel), label: String(entry.channel) }];
        return (
          <Stack key={entry.key} gap="xs">
            <Select
              allowDeselect={false}
              comboboxProps={sequenceSelectComboboxProps}
              label={t({ id: 'ProjectFixtures.fixture', defaultMessage: 'Fixture' })}
              data={fixtureData}
              value={owner?.publicId ?? unmatchedValue}
              onChange={value => {
                const fixture = sortedFixtures.find(candidate => candidate.publicId === value);
                if (!fixture) {
                  return;
                }
                const nextChannel = [...fixture.channels]
                  .sort((left, right) => left.channelNumber - right.channelNumber)
                  .map(channel => absoluteDmxChannel(fixture.startAddress, channel.channelNumber))
                  .find(absolute => absolute === entry.channel || !usedByOthers.has(absolute));
                if (nextChannel === undefined) {
                  return;
                }
                replaceDmx(entryIndex, nextChannel, entry.value);
              }}
            />
            <Group align="flex-end" wrap="nowrap">
              <Select
                allowDeselect={false}
                comboboxProps={sequenceSelectComboboxProps}
                style={{ flex: 1 }}
                label={t({ id: 'ProjectFunction.channel', defaultMessage: 'Channel' })}
                data={channelOptions}
                value={String(entry.channel)}
                onChange={value => {
                  const channel = Number(value);
                  if (!Number.isInteger(channel)) {
                    return;
                  }
                  replaceDmx(entryIndex, channel, entry.value);
                }}
              />
              <NumberInput
                style={{ flex: 1 }}
                label={t({ id: 'ProjectFunction.value', defaultMessage: 'Value' })}
                min={0}
                max={255}
                value={entry.value}
                onChange={value => {
                  replaceDmx(entryIndex, entry.channel, Number(value) || 0);
                }}
              />
              <ActionIcon
                color="red"
                variant="subtle"
                aria-label={t({ id: 'ProjectFunction.removeDmxValue', defaultMessage: 'Remove DMX value' })}
                onClick={() => {
                  onChange({
                    ...step,
                    dmxValues: step.dmxValues.filter((_, candidateIndex) => candidateIndex !== entryIndex),
                  });
                }}
              >
                <TrashIcon />
              </ActionIcon>
            </Group>
          </Stack>
        );
      })}
      <Button
        variant="light"
        size="xs"
        disabled={
          firstUnusedAbsoluteChannel(
            sortedFixtures,
            step.dmxValues.map(entry => entry.channel),
          ) === undefined
        }
        leftSection={<PlusIcon />}
        onClick={() => {
          const channel = firstUnusedAbsoluteChannel(
            sortedFixtures,
            step.dmxValues.map(entry => entry.channel),
          );
          if (channel === undefined) {
            return;
          }
          onChange({ ...step, dmxValues: [...step.dmxValues, newSequenceDmxValue(channel)] });
        }}
      >
        {t({ id: 'ProjectFunction.addDmxValue', defaultMessage: 'Add DMX value' })}
      </Button>
      {sortedFixtures.length === 0 ? (
        <Text size="sm" c="dimmed">
          {t({ id: 'ProjectDetail.virtualConsole.channelsEmpty', defaultMessage: 'No patched fixtures' })}
        </Text>
      ) : null}
    </Stack>
  );
};

const SequenceStepsEditor = ({ fixtures, steps, onChange }: SequenceStepsEditorProperties) => {
  const { t } = useTranslation();

  return (
    <Stack gap="md">
      <DragDropProvider
        onDragEnd={event => {
          if (event.operation.canceled) {
            return;
          }
          const source = event.operation.source;
          if (!isSortableSource(source) || source.initialIndex === source.index) {
            return;
          }
          onChange(moveSequenceStep(steps, source.initialIndex, source.index));
        }}
      >
        <Stack gap="md">
          {steps.map((step, index) => (
            <StepRow
              key={step.key}
              fixtures={fixtures}
              step={step}
              index={index}
              onChange={next => {
                onChange(steps.map((candidate, candidateIndex) => (candidateIndex === index ? next : candidate)));
              }}
              onRemove={() => {
                onChange(steps.filter((_, candidateIndex) => candidateIndex !== index));
              }}
            />
          ))}
        </Stack>
      </DragDropProvider>
      <Button
        variant="default"
        onClick={() => {
          onChange([...steps, emptySequenceStep()]);
        }}
      >
        {t({ id: 'ProjectFunction.addStep', defaultMessage: 'Add step' })}
      </Button>
    </Stack>
  );
};

export default SequenceStepsEditor;
