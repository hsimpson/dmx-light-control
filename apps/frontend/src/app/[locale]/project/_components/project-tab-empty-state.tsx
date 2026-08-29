'use client';

import { Center, Text } from '@mantine/core';

type ProjectTabEmptyStateProperties = {
  message: string;
};

const ProjectTabEmptyState = ({ message }: ProjectTabEmptyStateProperties) => (
  <Center py="xl">
    <Text c="dimmed">{message}</Text>
  </Center>
);

export default ProjectTabEmptyState;
