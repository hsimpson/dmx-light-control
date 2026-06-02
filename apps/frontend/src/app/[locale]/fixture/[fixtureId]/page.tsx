'use client';

import { useTranslation } from '@/lib/i18n/use-translation';
import { Title } from '@mantine/core';
import { useParams } from 'next/navigation';
import FixtureForm from '../_components/fixture-form';

const EditFixturePage = () => {
  const { t } = useTranslation();
  const { fixtureId } = useParams<{ fixtureId: string }>();

  return (
    <>
      <Title order={1}>
        {t({ id: 'EditFixturePage.title', defaultMessage: 'Edit Fixture' })}
      </Title>
      <FixtureForm fixtureId={fixtureId} />
    </>
  );
};

export default EditFixturePage;
