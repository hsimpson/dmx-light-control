'use client';

import { useDmxStore } from '@/lib/dmx/dmx-store';
import { useTranslation } from '@/lib/i18n/use-translation';
import { ActionIcon, Badge, Box, Button, Group, Modal, Select, Stack, Switch, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';
import type { ProjectFunctionDraft } from './project-function-mapping';
import { appendCapturedStep, mergeCapturedIntoStep } from './sequence-capture';
import SequenceFixtureList from './sequence-fixture-list';
import SequenceMatrix from './sequence-matrix';
import { setCellValue, type MatrixRange } from './sequence-matrix-model';
import { sequenceSliderGroups } from './sequence-slider-channels';
import SequenceSliderPanel from './sequence-slider-panel';
import { fixtureAbsoluteChannels, removeChannelValues, type SequenceFixtureChannel } from './sequence-steps';
import { useSequenceCapture } from './use-sequence-capture';
import { useSequenceLivePreview } from './use-sequence-live-preview';

const noChannels: readonly number[] = [];

const initialRange: MatrixRange = { anchor: { row: 0, column: 0 }, focus: { row: 0, column: 0 } };

type SequenceEditorProperties = {
  fixtures: SequenceFixtureChannel[];
  initial: ProjectFunctionDraft;
  saving: boolean;
  consoleChannels?: readonly number[];
  onSave: (draft: ProjectFunctionDraft) => Promise<boolean>;
  onLeave: () => void;
};

const SequenceEditor = ({
  fixtures,
  initial,
  saving,
  consoleChannels = noChannels,
  onSave,
  onLeave,
}: SequenceEditorProperties) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(initial);
  const [baseline, setBaseline] = useState(initial);
  const [range, setRange] = useState(initialRange);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [pendingFixtureIds, setPendingFixtureIds] = useState<string[] | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  const selectedStep =
    draft.steps.length > 0 ? Math.min(Math.max(range.focus.column, 0), draft.steps.length - 1) : undefined;
  const selectedFixtures = useMemo(
    () => fixtures.filter(fixture => draft.fixturePublicIds.includes(fixture.publicId)),
    [fixtures, draft.fixturePublicIds],
  );
  const sliderGroups = useMemo(() => sequenceSliderGroups(selectedFixtures), [selectedFixtures]);
  const zeroChannels = useMemo(
    () =>
      [
        ...new Set([
          ...sliderGroups.flatMap(group => group.channels.map(channel => channel.channel)),
          ...consoleChannels,
        ]),
      ].sort((left, right) => left - right),
    [sliderGroups, consoleChannels],
  );
  const livePreview = useSequenceLivePreview(draft.steps, selectedStep, zeroChannels, () => {
    notifications.show({
      color: 'orange',
      message: t({
        id: 'ProjectFunction.liveDisconnected',
        defaultMessage: 'Live preview stopped because the DMX connection was lost.',
      }),
    });
  });
  const patchedChannels = useMemo(() => new Set(selectedFixtures.flatMap(fixtureAbsoluteChannels)), [selectedFixtures]);
  const capture = useSequenceCapture(patchedChannels, livePreview.sentValues);
  const functionsRunning = useDmxStore(state => state.runningFunctionIds.length > 0);

  const storeAsStep = () => {
    const steps = appendCapturedStep(
      draft.steps,
      capture.capturedValues(),
      selectedStep === undefined ? undefined : draft.steps[selectedStep],
    );
    setDraft(current => ({ ...current, steps }));
    const cell = { row: range.focus.row, column: steps.length - 1 };
    setRange({ anchor: cell, focus: cell });
    capture.clear();
  };

  const removedChannels = (fixturePublicIds: string[]) =>
    new Set(
      selectedFixtures.filter(fixture => !fixturePublicIds.includes(fixture.publicId)).flatMap(fixtureAbsoluteChannels),
    );

  const applyFixtures = (fixturePublicIds: string[]) => {
    const channels = removedChannels(fixturePublicIds);
    setDraft(current => ({ ...current, fixturePublicIds, steps: removeChannelValues(current.steps, channels) }));
    if (channels.size > 0) {
      const cell = { row: 0, column: range.focus.column };
      setRange({ anchor: cell, focus: cell });
    }
  };

  const changeFixtures = (fixturePublicIds: string[]) => {
    const channels = removedChannels(fixturePublicIds);
    if (draft.steps.some(step => step.dmxValues.some(entry => channels.has(entry.channel)))) {
      setPendingFixtureIds(fixturePublicIds);
    } else {
      applyFixtures(fixturePublicIds);
    }
  };

  const setSliderValue = (channel: number, value: number) => {
    if (selectedStep === undefined) {
      return;
    }
    setDraft(current => ({
      ...current,
      steps: setCellValue(current.steps, selectedStep, { kind: 'channel', channel, label: '' }, value),
    }));
  };

  const updateStep = () => {
    if (selectedStep === undefined) {
      return;
    }
    const steps = mergeCapturedIntoStep(draft.steps, selectedStep, capture.capturedValues());
    setDraft(current => ({ ...current, steps }));
    capture.clear();
  };

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
    <Stack gap="sm" flex={1} mih={0} style={{ overflow: 'hidden' }}>
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
        <Stack gap={2} pb={6}>
          <Group gap="xs">
            <Text size="sm">
              {t(
                {
                  id: 'ProjectFunction.capture.count',
                  defaultMessage: '{count, plural, one {# channel} other {# channels}} captured',
                },
                { count: capture.touchedCount },
              )}
            </Text>
            <Button size="xs" variant="light" disabled={capture.touchedCount === 0} onClick={storeAsStep}>
              {t({ id: 'ProjectFunction.capture.storeAsStep', defaultMessage: 'Store as step' })}
            </Button>
            <Button
              size="xs"
              variant="light"
              disabled={capture.touchedCount === 0 || selectedStep === undefined}
              onClick={updateStep}
            >
              {t({ id: 'ProjectFunction.capture.updateStep', defaultMessage: 'Update step' })}
            </Button>
            <Button size="xs" variant="subtle" disabled={capture.touchedCount === 0} onClick={capture.clear}>
              {t({ id: 'ProjectFunction.capture.clear', defaultMessage: 'Clear' })}
            </Button>
          </Group>
          {functionsRunning ? (
            <Text size="xs" c="orange">
              {t({
                id: 'ProjectFunction.capture.runningWarning',
                defaultMessage: 'Running functions also change captured channels.',
              })}
            </Text>
          ) : null}
        </Stack>
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
      <SequenceFixtureList fixtures={fixtures} selectedIds={draft.fixturePublicIds} onChange={changeFixtures} />
      <SequenceMatrix
        fixtures={selectedFixtures}
        steps={draft.steps}
        range={range}
        onChange={steps => {
          setDraft(current => ({ ...current, steps }));
        }}
        onRangeChange={setRange}
      />
      {livePreview.live ? (
        <SequenceSliderPanel
          groups={sliderGroups}
          step={selectedStep === undefined ? undefined : draft.steps[selectedStep]}
          onChange={setSliderValue}
        />
      ) : null}
      <Modal
        opened={pendingFixtureIds !== null}
        title={t({ id: 'ProjectFunction.removeFixturesTitle', defaultMessage: 'Remove fixtures' })}
        onClose={() => {
          setPendingFixtureIds(null);
        }}
      >
        <Stack>
          <Text>
            {t({
              id: 'ProjectFunction.removeFixturesMessage',
              defaultMessage: 'The removed fixtures have values in this sequence. Delete their values from all steps?',
            })}
          </Text>
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                setPendingFixtureIds(null);
              }}
            >
              {t({ id: 'ProjectFunction.cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Button
              color="red"
              onClick={() => {
                if (pendingFixtureIds) {
                  applyFixtures(pendingFixtureIds);
                }
                setPendingFixtureIds(null);
              }}
            >
              {t({ id: 'ProjectFunction.removeFixtures', defaultMessage: 'Remove' })}
            </Button>
          </Group>
        </Stack>
      </Modal>
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
