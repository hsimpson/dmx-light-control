'use client';

import { useTranslation } from '@/lib/i18n/use-translation';
import { DragDropProvider } from '@dnd-kit/react';
import { ActionIcon, Button, Group, Stack, Text, TextInput } from '@mantine/core';
import { CaretDownIcon, CaretRightIcon, MagnifyingGlassIcon, PlusIcon } from '@phosphor-icons/react';
import clsx from 'clsx';
import { Fragment, useEffect, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import classes from './sequence-matrix.module.css';
import SequenceMatrixStepHeader from './sequence-matrix-step-header';
import {
  buildMatrixGroups,
  duplicateStep,
  fillRange,
  filterMatrixGroups,
  getCellValue,
  groupRowOffsets,
  insertEmptyStep,
  isCellInRange,
  parseCellInput,
  pasteTsv,
  rangeBounds,
  rangeToTsv,
  removeStep,
  setCellValue,
  TIMING_FIELDS,
  UNPATCHED_GROUP_KEY,
  visibleMatrixRows,
  type MatrixCell,
  type MatrixRange,
  type MatrixRow,
  type TimingField,
} from './sequence-matrix-model';
import {
  emptySequenceStep,
  moveSequenceStep,
  type SequenceFixtureChannel,
  type SequenceStepDraft,
} from './sequence-steps';

const HEADER_HEIGHT = 40;
const ROW_HEIGHT = 30;

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

export type SequenceMatrixProperties = {
  fixtures: SequenceFixtureChannel[];
  steps: SequenceStepDraft[];
  range: MatrixRange;
  onChange: (steps: SequenceStepDraft[]) => void;
  onRangeChange: (range: MatrixRange) => void;
};

const SequenceMatrix = ({ fixtures, steps, range, onChange, onRangeChange }: SequenceMatrixProperties) => {
  const { t } = useTranslation();
  const gridRef = useRef<HTMLTableElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editFinishedRef = useRef(false);
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const isEditing = editing !== null;

  const unpatchedLabel = t({ id: 'ProjectFunction.matrix.unpatched', defaultMessage: 'Unpatched' });
  const filterLabel = t({ id: 'ProjectFunction.matrix.filter', defaultMessage: 'Filter channels' });
  const groups = useMemo(
    () =>
      filterMatrixGroups(
        buildMatrixGroups(fixtures, steps).map(group =>
          group.key === UNPATCHED_GROUP_KEY ? { ...group, label: unpatchedLabel } : group,
        ),
        query,
      ),
    [fixtures, steps, query, unpatchedLabel],
  );
  const rows = visibleMatrixRows(groups, collapsed);
  const offsets = groupRowOffsets(groups, collapsed);
  const clampCell = (cell: MatrixCell): MatrixCell => ({
    row: Math.min(Math.max(cell.row, 0), rows.length - 1),
    column: Math.min(Math.max(cell.column, 0), Math.max(steps.length - 1, 0)),
  });
  const anchor = clampCell(range.anchor);
  const focus = clampCell(range.focus);
  const current: MatrixRange = { anchor, focus };
  const focusRow = rows[focus.row];
  const focusStep = steps[focus.column];

  useEffect(() => {
    gridRef.current?.querySelector('[data-focused="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [focus.row, focus.column]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  const timingLabel = (field: TimingField) => {
    switch (field) {
      case 'fadeIn':
        return t({ id: 'ProjectFunction.fadeIn', defaultMessage: 'Fade in (ms)' });
      case 'hold':
        return t({ id: 'ProjectFunction.hold', defaultMessage: 'Hold (ms)' });
      case 'fadeOut':
        return t({ id: 'ProjectFunction.fadeOut', defaultMessage: 'Fade out (ms)' });
    }
  };
  const rowLabel = (row: MatrixRow) => (row.kind === 'timing' ? timingLabel(row.field) : row.label);
  const stepLabel = (column: number) => `${t({ id: 'ProjectFunction.step', defaultMessage: 'Step' })} ${column + 1}`;

  const select = (cell: MatrixCell, extend: boolean) => {
    const next = clampCell(cell);
    setEditing(null);
    onRangeChange({ anchor: extend ? anchor : next, focus: next });
  };

  const startEditing = (initial: string) => {
    editFinishedRef.current = false;
    setEditing(initial);
  };

  const finishEditing = (raw: string | null, fill: boolean) => {
    if (editFinishedRef.current) {
      return;
    }
    editFinishedRef.current = true;
    setEditing(null);
    gridRef.current?.focus();
    if (raw === null || !focusRow) {
      return;
    }
    const value = parseCellInput(focusRow, raw);
    if (value === null) {
      return;
    }
    onChange(fill ? fillRange(steps, rows, current, value) : setCellValue(steps, focus.column, focusRow, value));
  };

  const onEditorKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
    const raw = event.currentTarget.value;
    const modifier = event.ctrlKey || event.metaKey;
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        finishEditing(raw, modifier);
        if (!modifier) {
          select({ row: focus.row + 1, column: focus.column }, false);
        }
        return;
      case 'Tab':
        event.preventDefault();
        finishEditing(raw, false);
        select({ row: focus.row, column: focus.column + (event.shiftKey ? -1 : 1) }, false);
        return;
      case 'Escape':
        event.preventDefault();
        finishEditing(null, false);
        return;
      default:
        return;
    }
  };

  const onGridKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
    if (event.target !== event.currentTarget || isEditing || !focusRow || !focusStep) {
      return;
    }
    const move = (rowDelta: number, columnDelta: number) => {
      select({ row: focus.row + rowDelta, column: focus.column + columnDelta }, event.shiftKey);
    };
    switch (event.key) {
      case 'ArrowUp':
        move(-1, 0);
        break;
      case 'ArrowDown':
        move(1, 0);
        break;
      case 'ArrowLeft':
        move(0, -1);
        break;
      case 'ArrowRight':
        move(0, 1);
        break;
      case 'Tab': {
        const column = focus.column + (event.shiftKey ? -1 : 1);
        if (column < 0 || column >= steps.length) {
          return;
        }
        select({ row: focus.row, column }, false);
        break;
      }
      case 'Enter':
      case 'F2':
        startEditing(String(getCellValue(focusStep, focusRow) ?? ''));
        break;
      case 'Delete':
      case 'Backspace':
        onChange(fillRange(steps, rows, current, undefined));
        break;
      default:
        if (!/^\d$/.test(event.key) || event.ctrlKey || event.metaKey || event.altKey) {
          return;
        }
        startEditing(event.key);
        break;
    }
    event.preventDefault();
  };

  const onCopy = (event: ClipboardEvent<HTMLTableElement>) => {
    if (event.target !== event.currentTarget || isEditing) {
      return;
    }
    event.clipboardData.setData('text/plain', rangeToTsv(steps, rows, current));
    event.preventDefault();
  };

  const onPaste = (event: ClipboardEvent<HTMLTableElement>) => {
    if (event.target !== event.currentTarget || isEditing) {
      return;
    }
    const { top, left } = rangeBounds(current);
    onChange(pasteTsv(steps, rows, { row: top, column: left }, event.clipboardData.getData('text/plain')));
    event.preventDefault();
  };

  const toggleGroup = (key: string) => {
    setCollapsed(previous => {
      const next = new Set(previous);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const renderCell = (row: MatrixRow, rowIndex: number, step: SequenceStepDraft, column: number, top?: number) => {
    const isFocused = rowIndex === focus.row && column === focus.column;
    const value = getCellValue(step, row);
    return (
      <td
        key={step.key}
        role="gridcell"
        aria-label={`${rowLabel(row)}, ${stepLabel(column)}`}
        aria-selected={isCellInRange(current, { row: rowIndex, column })}
        data-focused={isFocused}
        className={clsx(
          classes.cell,
          isFocused && classes.focused,
          value === undefined && classes.empty,
          top !== undefined && classes.timingCell,
        )}
        style={top === undefined ? undefined : { top }}
        onMouseDown={event => {
          if (isFocused && isEditing) {
            return;
          }
          event.preventDefault();
          gridRef.current?.focus();
          select({ row: rowIndex, column }, event.shiftKey);
        }}
        onDoubleClick={() => {
          startEditing(String(value ?? ''));
        }}
      >
        {isFocused && isEditing ? (
          <input
            ref={inputRef}
            className={classes.cellInput}
            inputMode="numeric"
            aria-label={t({ id: 'ProjectFunction.matrix.editCell', defaultMessage: 'Edit value' })}
            value={editing}
            onChange={event => {
              setEditing(event.currentTarget.value);
            }}
            onFocus={event => {
              const { length } = event.currentTarget.value;
              event.currentTarget.setSelectionRange(length, length);
            }}
            onKeyDown={onEditorKeyDown}
            onBlur={event => {
              finishEditing(event.currentTarget.value, false);
            }}
          />
        ) : (
          value
        )}
      </td>
    );
  };

  return (
    <Stack gap="xs" flex={1} mih={0}>
      <Group justify="space-between">
        <Group gap="xs">
          <TextInput
            size="xs"
            aria-label={filterLabel}
            placeholder={filterLabel}
            leftSection={<MagnifyingGlassIcon />}
            value={query}
            onChange={event => {
              setQuery(event.currentTarget.value);
            }}
          />
          <Button
            size="xs"
            variant="default"
            onClick={() => {
              setCollapsed(new Set(groups.map(group => group.key)));
            }}
          >
            {t({ id: 'ProjectFunction.matrix.collapseAll', defaultMessage: 'Collapse all' })}
          </Button>
          <Button
            size="xs"
            variant="default"
            onClick={() => {
              setCollapsed(new Set());
            }}
          >
            {t({ id: 'ProjectFunction.matrix.expandAll', defaultMessage: 'Expand all' })}
          </Button>
        </Group>
        <Button
          size="xs"
          variant="light"
          leftSection={<PlusIcon />}
          onClick={() => {
            onChange([...steps, emptySequenceStep()]);
          }}
        >
          {t({ id: 'ProjectFunction.addStep', defaultMessage: 'Add step' })}
        </Button>
      </Group>
      {steps.length === 0 ? (
        <Text size="sm" c="dimmed">
          {t({ id: 'ProjectFunction.matrix.noSteps', defaultMessage: 'No steps yet. Add a step to start.' })}
        </Text>
      ) : (
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
          <div className={classes.scroller}>
            <table
              ref={gridRef}
              role="grid"
              tabIndex={0}
              aria-label={t({ id: 'ProjectFunction.matrix.label', defaultMessage: 'Sequence steps' })}
              className={classes.grid}
              onKeyDown={onGridKeyDown}
              onCopy={onCopy}
              onPaste={onPaste}
            >
              <thead>
                <tr>
                  <th scope="col" className={classes.corner} style={{ height: HEADER_HEIGHT }} />
                  {steps.map((step, column) => (
                    <SequenceMatrixStepHeader
                      key={step.key}
                      stepKey={step.key}
                      index={column}
                      label={stepLabel(column)}
                      active={column === focus.column}
                      height={HEADER_HEIGHT}
                      onDuplicate={() => {
                        onChange(duplicateStep(steps, column));
                      }}
                      onInsertBefore={() => {
                        onChange(insertEmptyStep(steps, column));
                      }}
                      onInsertAfter={() => {
                        onChange(insertEmptyStep(steps, column + 1));
                      }}
                      onRemove={() => {
                        onChange(removeStep(steps, column));
                      }}
                    />
                  ))}
                </tr>
                {TIMING_FIELDS.map((field, index) => {
                  const top = HEADER_HEIGHT + index * ROW_HEIGHT;
                  const row: MatrixRow = { kind: 'timing', field };
                  return (
                    <tr key={field}>
                      <th scope="row" className={clsx(classes.rowLabel, classes.timingLabel)} style={{ top }}>
                        {timingLabel(field)}
                      </th>
                      {steps.map((step, column) => renderCell(row, index, step, column, top))}
                    </tr>
                  );
                })}
              </thead>
              <tbody>
                {groups.map((group, groupIndex) => {
                  const isCollapsed = collapsed.has(group.key);
                  const offset = offsets[groupIndex] ?? 0;
                  return (
                    <Fragment key={group.key}>
                      <tr className={classes.groupRow}>
                        <th scope="colgroup" colSpan={steps.length + 1}>
                          <Group gap={4} wrap="nowrap" className={classes.groupLabel}>
                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              aria-expanded={!isCollapsed}
                              aria-label={t(
                                { id: 'ProjectFunction.matrix.toggleGroup', defaultMessage: 'Toggle {name}' },
                                { name: group.label },
                              )}
                              onClick={() => {
                                toggleGroup(group.key);
                              }}
                            >
                              {isCollapsed ? <CaretRightIcon /> : <CaretDownIcon />}
                            </ActionIcon>
                            <Text size="sm" fw={600}>
                              {group.label}
                            </Text>
                          </Group>
                        </th>
                      </tr>
                      {isCollapsed
                        ? null
                        : group.rows.map((row, rowInGroup) => (
                            <tr key={`${group.key}-${row.channel}`}>
                              <th scope="row" className={classes.rowLabel}>
                                {row.label}
                              </th>
                              {steps.map((step, column) => renderCell(row, offset + rowInGroup, step, column))}
                            </tr>
                          ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </DragDropProvider>
      )}
    </Stack>
  );
};

export default SequenceMatrix;
