'use client';

import { useTranslation } from '@/lib/i18n/use-translation';
import { Title } from '@mantine/core';

const Home = () => {
  const { t } = useTranslation();

  return <Title order={1}>{t({ id: 'Home.title', defaultMessage: 'Home' })}</Title>;
};

export default Home;
