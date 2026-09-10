'use client';

import {
  DEFAULT_PROJECT_DETAIL_TAB,
  isValidProjectDetailTab,
} from '@/app/[locale]/project/_components/project-detail-tabs.constants';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const ProjectDetailTabPage = () => {
  const { publicId, tab } = useParams<{ publicId: string; tab: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!isValidProjectDetailTab(tab)) {
      router.replace(`/project/${publicId}/${DEFAULT_PROJECT_DETAIL_TAB}`);
    }
  }, [publicId, router, tab]);

  return null;
};

export default ProjectDetailTabPage;
