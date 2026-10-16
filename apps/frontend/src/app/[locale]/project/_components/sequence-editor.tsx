'use client';

import { useTranslation } from '@/lib/i18n/use-translation';
import { ActionIcon, Badge, Box, Button, Group, Modal, Select, Stack, Switch, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import type { ProjectFunctionDraft } from './project-function-mapping';
import SequenceMatrix from './sequence-matrix';
import type { MatrixRange } from './sequence-matrix-model';
import type { SequenceFixtureChannel } from './sequence-steps';
import { useSequenceLivePreview } from './use-sequence-live-preview';

const initialRange: MatrixRange = { anchor: { row: 0, column: 0 }, focus: { row: 0, column: 0 } };

type SequenceEditorProperties = {
  fixtures: SequenceFixtureChannel[];
  initial: ProjectFunctionDraft;
  saving: boolean;
  onSave: (draft: ProjectFunctionDraft) => Promise<boolean>;
  onLeave: () => void;
};

const SequenceEditor = ({ fixtures, initial, saving, onSave, onLeave }: SequenceEditorProperties) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(initial);
  const [baseline, setBaseline] = useState(initial);
  const [range, setRange] = useState(initialRange);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  const selectedStep =
    draft.steps.length > 0 ? Math.min(Math.max(range.focus.column, 0), draft.steps.length - 1) : undefined;
  const livePreview = useSequenceLivePreview(draft.steps, selectedStep, () => {
    notifications.show({
      color: 'orange',
      message: t({
        id: 'ProjectFunction.liveDisconnected',
        defaultMessage: 'Live preview stopped because the DMX connection was lost.',
      }),
    });
  });

  useEffect(() => {
    if (!dirty) {
      return;
    }
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => {
      window.removeEventListener('beforeunload', warn);
    };
  }, [dirty]);

  const save = async () => {
    if (await onSave(draft)) {
      setBaseline(draft);
    }
  };

  return (
    <Stack gap="sm" flex={1} mih={0}>
      <Group gap="sm" align="flex-end">
        <ActionIcon
          size="lg"
          variant="subtle"
          aria-label={t({ id: 'ProjectFunction.back', defaultMessage: 'Back' })}
          onClick={() => {
            if (dirty) {
              setConfirmLeave(true);
            } else {
              onLeave();
            }
          }}
        >
          <ArrowLeftIcon />
        </ActionIcon>
        <TextInput
          label={t({ id: 'ProjectFunction.name', defaultMessage: 'Name' })}
          value={draft.name}
          onChange={event => {
            const name = event.currentTarget.value;
            setDraft(current => ({ ...current, name }));
          }}
        />
        <Select
          allowDeselect={false}
          label={t({ id: 'ProjectFunction.direction', defaultMessage: 'Direction' })}
          data={[
            { value: 'forward', label: t({ id: 'ProjectFunction.directionForward', defaultMessage: 'Forward' }) },
            { value: 'backward', label: t({ id: 'ProjectFunction.directionBackward', defaultMessage: 'Backward' }) },
          ]}
          value={draft.direction}
          onChange={value => {
            if (value === 'forward' || value === 'backward') {
              setDraft(current => ({ ...current, direction: value }));
            }
          }}
        />
        <Select
          allowDeselect={false}
          label={t({ id: 'ProjectFunction.runOrder', defaultMessage: 'Run order' })}
          data={[
            { value: 'loop', label: t({ id: 'ProjectFunction.runOrderLoop', defaultMessage: 'Loop' }) },
            {
              value: 'singleShot',
              label: t({ id: 'ProjectFunction.runOrderSingleShot', defaultMessage: 'Single shot' }),
            },
            { value: 'pingPong', label: t({ id: 'ProjectFunction.runOrderPingPong', defaultMessage: 'Ping pong' }) },
          ]}
          value={draft.runOrder}
          onChange={value => {
            if (value === 'loop' || value === 'singleShot' || value === 'pingPong') {
              setDraft(current => ({ ...current, runOrder: value }));
            }
          }}
        />
        <Group gap="xs" pb={6}>
          <Switch
            label={t({ id: 'ProjectFunction.live', defaultMessage: 'Live' })}
            checked={livePreview.live}
            disabled={!livePreview.canGoLive && !livePreview.live}
            onChange={event => {
              livePreview.setLive(event.currentTarget.checked);
            }}
          />
          {livePreview.live ? (
            <Badge color="red" variant="filled">
              {t({ id: 'ProjectFunction.liveBadge', defaultMessage: 'LIVE' })}
            </Badge>
          ) : null}
        </Group>
        <Box flex={1} />
        <Button
          loading={saving}
          onClick={() => {
            void save();
          }}
        >
          {t({ id: 'ProjectFunction.save', defaultMessage: 'Save' })}
        </Button>
      </Group>
      <SequenceMatrix
        fixtures={fixtures}
        steps={draft.steps}
        range={range}
        onChange={steps => {
          setDraft(current => ({ ...current, steps }));
        }}
        onRangeChange={setRange}
      />
      <Modal
        opened={confirmLeave}
        title={t({ id: 'ProjectFunction.unsavedTitle', defaultMessage: 'Unsaved changes' })}
        onClose={() => {
          setConfirmLeave(false);
        }}
      >
        <Stack>
          <Text>
            {t({
              id: 'ProjectFunction.unsavedMessage',
              defaultMessage: 'You have unsaved changes. Leave without saving?',
            })}
          </Text>
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                setConfirmLeave(false);
              }}
            >
              {t({ id: 'ProjectFunction.cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Button color="red" onClick={onLeave}>
              {t({ id: 'ProjectFunction.leave', defaultMessage: 'Leave' })}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

export default SequenceEditor;
