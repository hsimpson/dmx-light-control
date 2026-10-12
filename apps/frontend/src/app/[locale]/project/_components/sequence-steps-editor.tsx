'use client';

import { useTranslation } from '@/lib/i18n/use-translation';
import { arrayMove } from '@dnd-kit/helpers';
import { DragDropProvider } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { ActionIcon, Button, Group, NumberInput, Stack, Text } from '@mantine/core';
import { DotsSixVerticalIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react';
import {
  emptySequenceStep,
  newSequenceDmxValue,
  renumberSequenceSteps,
  type SequenceStepDraft,
} from './sequence-steps';

type SequenceStepsEditorProperties = {
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
  step,
  index,
  onChange,
  onRemove,
}: {
  step: SequenceStepDraft;
  index: number;
  onChange: (step: SequenceStepDraft) => void;
  onRemove: () => void;
}) => {
  const { t } = useTranslation();
  const { ref, handleRef } = useSortable({ id: `step-${step.order}`, index });

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
            {t({ id: 'ProjectFunction.step', defaultMessage: 'Step' })} {step.order + 1}
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
      {step.dmxValues.map((entry, entryIndex) => (
        <Group key={entry.key} grow>
          <NumberInput
            label={t({ id: 'ProjectFunction.channel', defaultMessage: 'Channel' })}
            min={1}
            max={512}
            value={entry.channel}
            onChange={value => {
              const dmxValues = step.dmxValues.map((candidate, candidateIndex) =>
                candidateIndex === entryIndex ? { ...candidate, channel: Number(value) || 1 } : candidate,
              );
              onChange({ ...step, dmxValues });
            }}
          />
          <NumberInput
            label={t({ id: 'ProjectFunction.value', defaultMessage: 'Value' })}
            min={0}
            max={255}
            value={entry.value}
            onChange={value => {
              const dmxValues = step.dmxValues.map((candidate, candidateIndex) =>
                candidateIndex === entryIndex ? { ...candidate, value: Number(value) || 0 } : candidate,
              );
              onChange({ ...step, dmxValues });
            }}
          />
          <ActionIcon
            color="red"
            variant="subtle"
            mt={24}
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
      ))}
      <Button
        variant="light"
        size="xs"
        leftSection={<PlusIcon />}
        onClick={() => {
          onChange({ ...step, dmxValues: [...step.dmxValues, newSequenceDmxValue()] });
        }}
      >
        {t({ id: 'ProjectFunction.addDmxValue', defaultMessage: 'Add DMX value' })}
      </Button>
    </Stack>
  );
};

const SequenceStepsEditor = ({ steps, onChange }: SequenceStepsEditorProperties) => {
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
          onChange(renumberSequenceSteps(arrayMove(steps, source.initialIndex, source.index)));
        }}
      >
        <Stack gap="md">
          {steps.map((step, index) => (
            <StepRow
              key={`step-${step.order}`}
              step={step}
              index={index}
              onChange={next => {
                onChange(steps.map((candidate, candidateIndex) => (candidateIndex === index ? next : candidate)));
              }}
              onRemove={() => {
                onChange(renumberSequenceSteps(steps.filter((_, candidateIndex) => candidateIndex !== index)));
              }}
            />
          ))}
        </Stack>
      </DragDropProvider>
      <Button
        variant="default"
        onClick={() => {
          onChange([...steps, emptySequenceStep(steps.length)]);
        }}
      >
        {t({ id: 'ProjectFunction.addStep', defaultMessage: 'Add step' })}
      </Button>
    </Stack>
  );
};

export default SequenceStepsEditor;
