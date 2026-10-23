'use client';

import { useTranslation } from '@/lib/i18n/use-translation';
import { useSortable } from '@dnd-kit/react/sortable';
import { ActionIcon, Group, Menu, Text } from '@mantine/core';
import {
  ArrowLineLeftIcon,
  ArrowLineRightIcon,
  CopySimpleIcon,
  DotsSixVerticalIcon,
  DotsThreeIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import clsx from 'clsx';
import classes from './sequence-matrix.module.css';

type SequenceMatrixStepHeaderProperties = {
  stepKey: string;
  index: number;
  label: string;
  active: boolean;
  height: number;
  onDuplicate: () => void;
  onInsertBefore: () => void;
  onInsertAfter: () => void;
  onRemove: () => void;
};

const SequenceMatrixStepHeader = ({
  stepKey,
  index,
  label,
  active,
  height,
  onDuplicate,
  onInsertBefore,
  onInsertAfter,
  onRemove,
}: SequenceMatrixStepHeaderProperties) => {
  const { t } = useTranslation();
  const { ref, handleRef } = useSortable({ id: stepKey, index });

  return (
    <th ref={ref} scope="col" className={clsx(classes.stepHeader, active && classes.activeColumn)} style={{ height }}>
      <Group gap={2} justify="center" wrap="nowrap">
        <ActionIcon
          ref={handleRef}
          size="sm"
          variant="subtle"
          aria-label={t({ id: 'ProjectFunction.dragStep', defaultMessage: 'Drag step' })}
        >
          <DotsSixVerticalIcon />
        </ActionIcon>
        <Text size="sm" fw={600}>
          {label}
        </Text>
        <Menu position="bottom-end" withinPortal hideDetached={false}>
          <Menu.Target>
            <ActionIcon
              size="sm"
              variant="subtle"
              aria-label={t(
                { id: 'ProjectFunction.matrix.stepActions', defaultMessage: '{step} actions' },
                { step: label },
              )}
            >
              <DotsThreeIcon />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<CopySimpleIcon />} onClick={onDuplicate}>
              {t({ id: 'ProjectFunction.matrix.duplicateStep', defaultMessage: 'Duplicate step' })}
            </Menu.Item>
            <Menu.Item leftSection={<ArrowLineLeftIcon />} onClick={onInsertBefore}>
              {t({ id: 'ProjectFunction.matrix.insertBefore', defaultMessage: 'Insert step before' })}
            </Menu.Item>
            <Menu.Item leftSection={<ArrowLineRightIcon />} onClick={onInsertAfter}>
              {t({ id: 'ProjectFunction.matrix.insertAfter', defaultMessage: 'Insert step after' })}
            </Menu.Item>
            <Menu.Item color="red" leftSection={<TrashIcon />} onClick={onRemove}>
              {t({ id: 'ProjectFunction.removeStep', defaultMessage: 'Remove step' })}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </th>
  );
};

export default SequenceMatrixStepHeader;
