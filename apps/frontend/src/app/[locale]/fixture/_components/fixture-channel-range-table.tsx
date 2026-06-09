'use client';

import { FixtureChannelRange } from '@/shared/types/fixtures';
import { DataTable } from 'mantine-datatable';

type FixtureChannelRangeTableProps = {
  fixtureChannelRanges: FixtureChannelRange[];
};

const FixtureChannelRangeTable = ({ fixtureChannelRanges }: FixtureChannelRangeTableProps) => {
  return (
    <DataTable
      withTableBorder
      borderRadius="sm"
      withColumnBorders
      striped
      highlightOnHover
      idAccessor="publicId"
      records={fixtureChannelRanges}
      columns={[
        {
          accessor: 'dmxStart',
          title: 'DMX Start',
        },
        {
          accessor: 'dmxEnd',
          title: 'DMX End',
        },
        {
          accessor: 'description',
          title: 'Description',
        },
      ]}
    />
  );
};

export default FixtureChannelRangeTable;
