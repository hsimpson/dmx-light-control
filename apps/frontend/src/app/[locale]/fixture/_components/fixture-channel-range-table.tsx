'use client';

import { ICON_SIZE } from '@/lib/constants';
import { globalMessages } from '@/lib/i18n/global-messages';
import { useTranslation } from '@/lib/i18n/use-translation';
import { dmxRangeSorter } from '@/shared/sorter';
import { FixtureChannelRange } from '@/shared/types/fixtures';
import { ActionIcon, Button, Flex, Group, Modal, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { CheckIcon, ListPlusIcon, PencilSimpleIcon, TrashIcon, UploadSimpleIcon, XIcon } from '@phosphor-icons/react';
import { DataTable } from 'mantine-datatable';
import { useMemo, useRef, useState } from 'react';
import { parseChannelRangeImport } from './parse-channel-range-import';

type ChannelRangeInput = {
  dmxStart: number;
  dmxEnd: number;
  description: string;
};

type FixtureChannelRangeTableProps = {
  fixtureChannelRanges: FixtureChannelRange[];
  onAdd?: (start: number, end: number, description: string) => void;
  onBulkAdd?: (ranges: ChannelRangeInput[]) => boolean;
  onEdit?: (rangeToEdit: FixtureChannelRange, start: number, end: number, description: string) => void;
  onDelete?: (rangeToDelete: FixtureChannelRange) => void;
};

type RangeEditDraft = {
  dmxStart: string;
  dmxEnd: string;
  description: string;
};

const SCROLL_THRESHOLD = 10;
const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 40;
const DESCRIPTION_MAX_LENGTH = 1024;

const clampTo0255 = (value: string) => {
  if (value === '') return '';
  const num = Number(value);
  if (isNaN(num)) return '';
  if (num < 0) return '0';
  if (num > 255) return '255';
  return String(num);
};

const FixtureChannelRangeTable = ({
  fixtureChannelRanges,
  onAdd,
  onBulkAdd,
  onEdit,
  onDelete,
}: FixtureChannelRangeTableProps) => {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [description, setDescription] = useState('');
  const [importText, setImportText] = useState('');
  const [editingRangeKey, setEditingRangeKey] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<RangeEditDraft>({ dmxStart: '', dmxEnd: '', description: '' });
  const editingRangeKeyRef = useRef<string | null>(null);
  const [importOpened, { open: openImport, close: closeImport }] = useDisclosure(false);
  const { t } = useTranslation();

  const idAccessor = (range: FixtureChannelRange) => {
    const r = range as Partial<FixtureChannelRange>;
    return r.publicId ?? r.description ?? '';
  };

  const canSubmit = start.trim() && end.trim() && description.trim();
  const canConfirmEdit = editDraft.dmxStart.trim() && editDraft.dmxEnd.trim() && editDraft.description.trim();
  const sortedRecords = [...fixtureChannelRanges].sort(dmxRangeSorter);
  const tableHeight = sortedRecords.length > SCROLL_THRESHOLD ? HEADER_HEIGHT + SCROLL_THRESHOLD * ROW_HEIGHT : 'auto';
  const editLabel = t({ id: 'FixtureChannelRangeTable.edit', defaultMessage: 'Edit' });
  const importLabel = t({ id: 'FixtureChannelRangeTable.import', defaultMessage: 'Import' });
  const importParseResult = useMemo(() => parseChannelRangeImport(importText), [importText]);
  const canImport =
    importText.trim().length > 0 && importParseResult.errors.length === 0 && importParseResult.ranges.length > 0;

  const cancelEdit = () => {
    editingRangeKeyRef.current = null;
    setEditingRangeKey(null);
    setEditDraft({ dmxStart: '', dmxEnd: '', description: '' });
  };

  const startEdit = (range: FixtureChannelRange) => {
    const key = idAccessor(range);
    editingRangeKeyRef.current = key;
    setEditingRangeKey(key);
    setEditDraft({
      dmxStart: String(range.dmxStart),
      dmxEnd: String(range.dmxEnd),
      description: range.description,
    });
  };

  const confirmEdit = (range: FixtureChannelRange) => {
    if (editingRangeKeyRef.current !== idAccessor(range) || !canConfirmEdit) {
      return;
    }

    onEdit?.(range, Number(editDraft.dmxStart), Number(editDraft.dmxEnd), editDraft.description.trim());
    cancelEdit();
  };

  const handleAdd = () => {
    if (!canSubmit) return;
    if (onAdd) {
      onAdd(Number(start), Number(end), description.trim());
    }
    setStart('');
    setEnd('');
    setDescription('');
  };

  const handleOpenImport = () => {
    setImportText('');
    openImport();
  };

  const handleCloseImport = () => {
    setImportText('');
    closeImport();
  };

  const handleImport = () => {
    if (!canImport || !onBulkAdd) {
      return;
    }

    const imported = onBulkAdd(importParseResult.ranges);
    if (!imported) {
      return;
    }

    setImportText('');
    closeImport();
  };

  return (
    <>
      <Flex direction="row" gap="xs" align="flex-end" mb="xs">
        <TextInput
          w={100}
          placeholder={t({ id: 'FixtureChannelRangeTable.dmxStart', defaultMessage: 'DMX Start' })}
          type="number"
          value={start}
          onChange={event => {
            setStart(clampTo0255(event.currentTarget.value));
          }}
        />
        <TextInput
          w={100}
          placeholder={t({ id: 'FixtureChannelRangeTable.dmxEnd', defaultMessage: 'DMX End' })}
          type="number"
          value={end}
          onChange={event => {
            setEnd(clampTo0255(event.currentTarget.value));
          }}
        />
        <Textarea
          style={{ flex: 1, minWidth: '50ch' }}
          placeholder={t({ id: 'FixtureChannelRangeTable.description', defaultMessage: 'Description' })}
          value={description}
          maxLength={DESCRIPTION_MAX_LENGTH}
          autosize
          minRows={2}
          onChange={event => {
            setDescription(event.currentTarget.value);
          }}
        />
        <ActionIcon variant="filled" size="lg" radius="lg" disabled={!canSubmit} onClick={handleAdd}>
          <ListPlusIcon size={ICON_SIZE} weight="fill" />
        </ActionIcon>
        {onBulkAdd && (
          <ActionIcon
            variant="light"
            size="lg"
            radius="lg"
            aria-label={importLabel}
            title={importLabel}
            onClick={handleOpenImport}
          >
            <UploadSimpleIcon size={ICON_SIZE} weight="duotone" />
          </ActionIcon>
        )}
      </Flex>
      <Modal
        opened={importOpened}
        onClose={handleCloseImport}
        title={t({ id: 'FixtureChannelRangeTable.importTitle', defaultMessage: 'Import channel ranges' })}
        centered
        size="auto"
      >
        <Text size="sm" mb="sm">
          {t({
            id: 'FixtureChannelRangeTable.importHelp',
            defaultMessage: 'Enter one range per line: DMX_START - DMX_END DESCRIPTION (e.g. 0 - 255 off-full)',
          })}
        </Text>
        <Textarea
          autosize
          value={importText}
          minRows={20}
          style={{ minWidth: '100ch' }}
          placeholder={t({
            id: 'FixtureChannelRangeTable.importPlaceholder',
            defaultMessage: '0 - 255 off-full\n10 - 19 slow strobe',
          })}
          onChange={event => {
            setImportText(event.currentTarget.value);
          }}
        />
        {importParseResult.errors.length > 0 && (
          <Stack gap="xs" mt="sm">
            {importParseResult.errors.map(error => (
              <Text key={`${error.line}-${error.message}`} size="sm" c="red">
                {error.message === 'duplicateDescription'
                  ? t(
                      {
                        id: 'FixtureChannelRangeTable.importDuplicateLine',
                        defaultMessage: 'Line {line}: duplicate description',
                      },
                      { line: error.line },
                    )
                  : t(
                      {
                        id: 'FixtureChannelRangeTable.importInvalidLine',
                        defaultMessage: 'Line {line}: invalid format',
                      },
                      { line: error.line },
                    )}
              </Text>
            ))}
          </Stack>
        )}
        <Group justify="space-between" mt="md">
          <Button type="button" variant="default" onClick={handleCloseImport}>
            {t(globalMessages.cancel)}
          </Button>
          <Button type="button" disabled={!canImport} onClick={handleImport}>
            {importLabel}
          </Button>
        </Group>
      </Modal>
      <DataTable
        withColumnBorders
        striped
        highlightOnHover
        minHeight={150}
        height={tableHeight}
        idAccessor={idAccessor}
        records={sortedRecords}
        columns={[
          {
            accessor: 'dmxStart',
            title: t({ id: 'FixtureChannelRangeTable.dmxStart', defaultMessage: 'DMX Start' }),
            render: range => {
              if (editingRangeKey !== idAccessor(range)) {
                return range.dmxStart;
              }

              return (
                <TextInput
                  type="number"
                  value={editDraft.dmxStart}
                  onChange={event => {
                    const value = event.currentTarget.value;
                    setEditDraft(current => ({ ...current, dmxStart: clampTo0255(value) }));
                  }}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      confirmEdit(range);
                    }
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      cancelEdit();
                    }
                  }}
                />
              );
            },
          },
          {
            accessor: 'dmxEnd',
            title: t({ id: 'FixtureChannelRangeTable.dmxEnd', defaultMessage: 'DMX End' }),
            render: range => {
              if (editingRangeKey !== idAccessor(range)) {
                return range.dmxEnd;
              }

              return (
                <TextInput
                  type="number"
                  value={editDraft.dmxEnd}
                  onChange={event => {
                    const value = event.currentTarget.value;
                    setEditDraft(current => ({ ...current, dmxEnd: clampTo0255(value) }));
                  }}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      confirmEdit(range);
                    }
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      cancelEdit();
                    }
                  }}
                />
              );
            },
          },
          {
            accessor: 'description',
            title: t({ id: 'FixtureChannelRangeTable.description', defaultMessage: 'Description' }),
            cellsStyle: () => ({ whiteSpace: 'pre-wrap' }),
            render: range => {
              if (editingRangeKey !== idAccessor(range)) {
                return range.description;
              }

              return (
                <Textarea
                  value={editDraft.description}
                  maxLength={DESCRIPTION_MAX_LENGTH}
                  autosize
                  minRows={2}
                  onChange={event => {
                    const value = event.currentTarget.value;
                    setEditDraft(current => ({ ...current, description: value }));
                  }}
                  onKeyDown={event => {
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      cancelEdit();
                    }
                  }}
                />
              );
            },
          },
          {
            accessor: 'actions',
            title: '',
            textAlign: 'right',
            render: range => {
              const isEditing = editingRangeKey === idAccessor(range);

              return (
                <Group gap={4} justify="right" wrap="nowrap">
                  {isEditing ? (
                    <>
                      <ActionIcon
                        aria-label={t(globalMessages.save)}
                        title={t(globalMessages.save)}
                        disabled={!canConfirmEdit}
                        onClick={event => {
                          event.stopPropagation();
                          confirmEdit(range);
                        }}
                      >
                        <CheckIcon size={ICON_SIZE} weight="bold" />
                      </ActionIcon>
                      <ActionIcon
                        aria-label={t(globalMessages.cancel)}
                        title={t(globalMessages.cancel)}
                        onClick={event => {
                          event.stopPropagation();
                          cancelEdit();
                        }}
                      >
                        <XIcon size={ICON_SIZE} weight="bold" />
                      </ActionIcon>
                    </>
                  ) : (
                    <>
                      {onEdit && (
                        <ActionIcon
                          aria-label={editLabel}
                          title={editLabel}
                          onClick={event => {
                            event.stopPropagation();
                            startEdit(range);
                          }}
                        >
                          <PencilSimpleIcon size={ICON_SIZE} weight="fill" />
                        </ActionIcon>
                      )}
                      <ActionIcon
                        onClick={event => {
                          event.stopPropagation();
                          if (onDelete) {
                            onDelete(range);
                          }
                        }}
                      >
                        <TrashIcon size={ICON_SIZE} weight="fill" />
                      </ActionIcon>
                    </>
                  )}
                </Group>
              );
            },
          },
        ]}
      />
    </>
  );
};

export default FixtureChannelRangeTable;
