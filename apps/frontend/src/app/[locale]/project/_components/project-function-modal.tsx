'use client';

import { useTranslation } from '@/lib/i18n/use-translation';
import { Button, Group, Modal, Select, Stack, TextInput } from '@mantine/core';
import { useState } from 'react';
import type { ProjectFunctionDraft } from './project-function-mapping';
import SequenceStepsEditor from './sequence-steps-editor';
import type { SequenceFixtureChannel } from './sequence-steps';

type ProjectFunctionModalProperties = {
  opened: boolean;
  title: string;
  fixtures: SequenceFixtureChannel[];
  initial: ProjectFunctionDraft;
  saving: boolean;
  onClose: () => void;
  onSave: (draft: ProjectFunctionDraft) => void;
};

const ProjectFunctionModal = ({
  opened,
  title,
  fixtures,
  initial,
  saving,
  onClose,
  onSave,
}: ProjectFunctionModalProperties) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<ProjectFunctionDraft>(initial);

  return (
    <Modal opened={opened} title={title} size="lg" onClose={onClose}>
      <Stack>
        <TextInput
          label={t({ id: 'ProjectFunction.name', defaultMessage: 'Name' })}
          value={draft.name}
          onChange={event => {
            setDraft({ ...draft, name: event.currentTarget.value });
          }}
        />
        <Select
          allowDeselect={false}
          label={t({ id: 'ProjectFunction.type', defaultMessage: 'Type' })}
          data={[{ value: 'Sequence', label: t({ id: 'ProjectFunction.typeSequence', defaultMessage: 'Sequence' }) }]}
          value="Sequence"
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
              setDraft({ ...draft, direction: value });
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
              setDraft({ ...draft, runOrder: value });
            }
          }}
        />
        <SequenceStepsEditor
          fixtures={fixtures}
          steps={draft.steps}
          onChange={steps => {
            setDraft({ ...draft, steps });
          }}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t({ id: 'ProjectFunction.cancel', defaultMessage: 'Cancel' })}
          </Button>
          <Button
            loading={saving}
            onClick={() => {
              onSave(draft);
            }}
          >
            {t({ id: 'ProjectFunction.save', defaultMessage: 'Save' })}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
export default ProjectFunctionModal;
