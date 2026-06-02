'use client';

import { useTranslation } from '@/lib/i18n/use-translation';
import { Title } from '@mantine/core';
import FixtureForm from '../_components/fixture-form';

export const AddFixturePage = () => {
  const { t } = useTranslation();

  return (
    <>
      <Title order={1}>
        {t({ id: 'AddFixturePage.title', defaultMessage: 'Add Fixture' })}
      </Title>
      <FixtureForm />
    </>
  );
};

export default AddFixturePage;
