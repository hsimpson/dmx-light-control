'use client';

import { ICON_SIZE } from '@/lib/constants';
import { useTranslation } from '@/lib/i18n/use-translation';
import { dmxRangeSorter } from '@/shared/sorter';
import { FixtureChannelRange } from '@/shared/types/fixtures';
import { ActionIcon, Flex, Group, TextInput } from '@mantine/core';
import { ListPlusIcon, TrashIcon } from '@phosphor-icons/react';
import { DataTable } from 'mantine-datatable';
import { useState } from 'react';

type FixtureChannelRangeTableProps = {
  fixtureChannelRanges: FixtureChannelRange[];
  onAdd?: (start: number, end: number, description: string) => void;
  onDelete?: (rangeToDelete: FixtureChannelRange) => void;
};

const SCROLL_THRESHOLD = 10;
const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 40;

const FixtureChannelRangeTable = ({ fixtureChannelRanges, onAdd, onDelete }: FixtureChannelRangeTableProps) => {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [description, setDescription] = useState('');
  const { t } = useTranslation();

  const clampTo0255 = (value: string) => {
    if (value === '') return '';
    const num = Number(value);
    if (isNaN(num)) return '';
    if (num < 0) return '0';
    if (num > 255) return '255';
    return String(num);
  };

  const idAccessor = (range: FixtureChannelRange) => {
    const r = range as Partial<FixtureChannelRange>;
    return r.publicId ?? r.description ?? '';
  };

  const canSubmit = start.trim() && end.trim() && description.trim();
  const sortedRecords = [...fixtureChannelRanges].sort(dmxRangeSorter);
  const tableHeight = sortedRecords.length > SCROLL_THRESHOLD ? HEADER_HEIGHT + SCROLL_THRESHOLD * ROW_HEIGHT : 'auto';

  const handleAdd = () => {
    if (!canSubmit) return;
    if (onAdd) {
      onAdd(Number(start), Number(end), description.trim());
    }
    setStart('');
    setEnd('');
    setDescription('');
  };

  return (
    <>
      <Flex direction="row" gap="xs" align="center" mb="xs">
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
        <TextInput
          style={{ flex: 1 }}
          placeholder={t({ id: 'FixtureChannelRangeTable.description', defaultMessage: 'Description' })}
          value={description}
          onChange={event => {
            setDescription(event.currentTarget.value);
          }}
        />
        <ActionIcon variant="filled" size="lg" radius="lg" disabled={!canSubmit} onClick={handleAdd}>
          <ListPlusIcon size={ICON_SIZE} weight="fill" />
        </ActionIcon>
      </Flex>
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
          },
          {
            accessor: 'dmxEnd',
            title: t({ id: 'FixtureChannelRangeTable.dmxEnd', defaultMessage: 'DMX End' }),
          },
          {
            accessor: 'description',
            title: t({ id: 'FixtureChannelRangeTable.description', defaultMessage: 'Description' }),
          },
          {
            accessor: 'actions',
            title: '',
            textAlign: 'right',
            render: range => {
              return (
                <Group gap={4} justify="right" wrap="nowrap">
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
