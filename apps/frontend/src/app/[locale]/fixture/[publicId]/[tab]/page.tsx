'use client';

import {
  DEFAULT_FIXTURE_DETAIL_TAB,
  isValidFixtureDetailTab,
} from '@/app/[locale]/fixture/_components/fixture-detail-tabs.constants';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const FixtureDetailTabPage = () => {
  const { publicId, tab } = useParams<{ publicId: string; tab: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!isValidFixtureDetailTab(tab)) {
      router.replace(`/fixture/${publicId}/${DEFAULT_FIXTURE_DETAIL_TAB}`);
    }
  }, [publicId, router, tab]);

  return null;
};

export default FixtureDetailTabPage;
