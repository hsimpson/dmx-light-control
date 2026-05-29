'use client';

import { useTranslation } from '@/lib/i18n/use-translation';
import { GetFixturesDocument } from '@/shared/types/graphql/graphql';
import { useQuery } from '@apollo/client/react';

const FixtureListPage = () => {
  const { t } = useTranslation();
  const { data, loading } = useQuery(GetFixturesDocument);

  return (
    <>
      <div>
        {t({ id: 'FixtureList.title', defaultMessage: 'Fixture list' })}
      </div>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </>
  );
};

export default FixtureListPage;
