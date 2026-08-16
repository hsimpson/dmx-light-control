'use client';

import { useTranslation } from '@/lib/i18n/use-translation';
import { Flex, Title } from '@mantine/core';
import FixtureListToolbar from './fixture/_components/fixture-list-toolbar';

const Home = () => {
  const { t } = useTranslation();

  return (
    <Flex direction="row" justify="space-between" align="center" mb="md">
      <Title order={1}>{t({ id: 'Home.title', defaultMessage: 'Home' })}</Title>
      <FixtureListToolbar />
    </Flex>
  );
};

export default Home;
