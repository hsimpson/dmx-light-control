'use client';

import { useTranslation } from '@/lib/i18n/use-translation';

const FixtureListPage = () => {
  const { t } = useTranslation();

  return (
    <div>{t({ id: 'FixtureList.title', defaultMessage: 'Fixture list' })}</div>
  );
};

export default FixtureListPage;
