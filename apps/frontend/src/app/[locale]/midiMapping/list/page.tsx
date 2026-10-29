'use client';

import { useTranslation } from '@/lib/i18n/use-translation';
import { Flex, Title } from '@mantine/core';
import MidiMappingTable from '../_components/midi-mapping-table';

const MidiMappingListPage = () => {
  const { t } = useTranslation();

  return (
    <>
      <Flex direction="row" justify="space-between" align="center" mb="md">
        <Title order={1}>{t({ id: 'MidiMappingList.title', defaultMessage: 'MIDI mappings' })}</Title>
      </Flex>
      <MidiMappingTable />
    </>
  );
};

export default MidiMappingListPage;
