'use client';

import { Loading } from '@/components/loading';
import { useTranslation } from '@/lib/i18n/use-translation';
import { GetProjectDocument } from '@/shared/types/graphql/graphql';
import { useQuery } from '@apollo/client/react';
import { Text, Title } from '@mantine/core';
import { useParams } from 'next/navigation';
import ProjectDetailTabs from '../_components/project-detail-tabs';

const ProjectDetailPage = () => {
  const { t } = useTranslation();
  const { publicId } = useParams<{ publicId: string }>();
  const { data, loading } = useQuery(GetProjectDocument, {
    variables: { publicId },
    skip: !publicId,
  });

  if (loading) {
    return <Loading />;
  }

  const project = data?.project;
  if (!project) {
    return <Text>{t({ id: 'ProjectDetail.notFound', defaultMessage: 'Project not found' })}</Text>;
  }

  return (
    <>
      <Title order={1} mb="md">
        {project.name}
      </Title>
      <ProjectDetailTabs projectPublicId={project.publicId} />
    </>
  );
};

export default ProjectDetailPage;
