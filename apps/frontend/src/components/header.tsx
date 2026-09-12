import { Flex, Title } from '@mantine/core';
import type { ReactNode } from 'react';
import LanguageSwitcher from './language-switcher';
import ThemeToggle from './theme-toggle';

type HeaderProperties = {
  leading?: ReactNode;
};

const Header = ({ leading }: HeaderProperties) => {
  return (
    <Flex mih={60} gap="md" justify="flex-start" align="center" direction="row" wrap="nowrap" px="sm">
      {leading}
      <img src="/images/logo.svg" width={44} height={44} alt="DMX Light Control logo" role="img" />
      <Title order={1}>DMX Light Control</Title>
      <LanguageSwitcher ml="auto" />
      <ThemeToggle mr="md" />
    </Flex>
  );
};

export default Header;
