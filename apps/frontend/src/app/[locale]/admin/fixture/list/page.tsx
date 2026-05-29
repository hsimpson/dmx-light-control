'use client';

import { useTranslation } from '@/lib/i18n/use-translation';
import { GetFixturesDocument } from '@/shared/types/graphql/graphql';
import { useQuery } from '@apollo/client/react';
import styles from './page.module.css';

const FixtureListPage = () => {
  const { t } = useTranslation();
  const { data, loading } = useQuery(GetFixturesDocument);

  const vendors = data?.fixtures.map((fixture) => fixture.vendor);

  console.log('Vendors:', vendors);

  return (
    <div className={styles.page}>
      <p>{t({ id: 'FixtureList.title', defaultMessage: 'Fixture list' })}</p>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

export default FixtureListPage;
