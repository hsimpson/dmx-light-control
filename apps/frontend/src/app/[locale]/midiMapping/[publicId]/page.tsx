'use client';

import { Loading } from '@/components/loading';
import { useTranslation } from '@/lib/i18n/use-translation';
import { GetMidiMappingDocument } from '@/shared/types/graphql/graphql';
import { useQuery } from '@apollo/client/react';
import { Text, Title } from '@mantine/core';
import { useParams } from 'next/navigation';
import MidiMappingEditor from '../_components/midi-mapping-editor';

const MidiMappingDetailPage = () => {
  const { t } = useTranslation();
  const { publicId } = useParams<{ publicId: string }>();
  const { data, loading } = useQuery(GetMidiMappingDocument, { variables: { publicId } });

  if (loading) {
    return <Loading />;
  }

  const mapping = data?.midiMapping;
  if (!mapping) {
    return <Text>{t({ id: 'MidiMappingDetail.notFound', defaultMessage: 'MIDI mapping not found' })}</Text>;
  }

  return (
    <>
      <Title order={1} mb="md">
        {mapping.name}
      </Title>
      <MidiMappingEditor key={mapping.publicId} mapping={mapping} />
    </>
  );
};

export default MidiMappingDetailPage;
