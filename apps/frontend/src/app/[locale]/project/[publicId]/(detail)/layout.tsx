'use client';

import { Loading } from '@/components/loading';
import { useTranslation } from '@/lib/i18n/use-translation';
import { GetProjectDocument } from '@/shared/types/graphql/graphql';
import { skipToken, useQuery } from '@apollo/client/react';
import { Box, Text, Title } from '@mantine/core';
import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import ProjectDetailTabs from '../../_components/project-detail-tabs';
import { useActivateProject } from '../../_components/use-activate-project';

type ProjectDetailLayoutProperties = {
  children: ReactNode;
};

const ProjectDetailLayout = ({ children }: ProjectDetailLayoutProperties) => {
  const { t } = useTranslation();
  const { publicId } = useParams<{ publicId: string }>();
  const { data, loading } = useQuery(GetProjectDocument, publicId ? { variables: { publicId } } : skipToken);
  useActivateProject(publicId);

  if (loading) {
    return <Loading />;
  }

  const project = data?.project;
  if (!project) {
    return <Text>{t({ id: 'ProjectDetail.notFound', defaultMessage: 'Project not found' })}</Text>;
  }

  return (
    <Box flex={1} mih={0} h="100%" display="flex" style={{ flexDirection: 'column', overflow: 'hidden' }}>
      <Title order={1} mb="md">
        {project.name}
      </Title>
      <ProjectDetailTabs projectPublicId={project.publicId} />
      {children}
    </Box>
  );
};

export default ProjectDetailLayout;
