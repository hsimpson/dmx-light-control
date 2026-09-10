'use client';

import {
  DEFAULT_FIXTURE_DETAIL_TAB,
  isValidFixtureDetailTab,
} from '@/app/[locale]/fixture/_components/fixture-detail-tabs.constants';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const AddFixtureTabPage = () => {
  const { tab } = useParams<{ tab: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!isValidFixtureDetailTab(tab)) {
      router.replace(`/fixture/new/${DEFAULT_FIXTURE_DETAIL_TAB}`);
    }
  }, [router, tab]);

  return null;
};

export default AddFixtureTabPage;
