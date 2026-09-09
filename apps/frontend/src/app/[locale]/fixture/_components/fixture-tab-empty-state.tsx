'use client';

import { Center, Text } from '@mantine/core';

type FixtureTabEmptyStateProperties = {
  message: string;
};

const FixtureTabEmptyState = ({ message }: FixtureTabEmptyStateProperties) => (
  <Center py="xl">
    <Text c="dimmed">{message}</Text>
  </Center>
);

export default FixtureTabEmptyState;
