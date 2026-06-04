import { Flex, Title } from '@mantine/core';
import ThemeToggle from './theme-toggle';

const Header = () => {
  return (
    <Flex mih={60} gap="md" justify="flex-start" align="center" direction="row" wrap="wrap">
      <img src="/images/logo.svg" width={44} height={44} alt="DMX Light Control logo" role="img" />
      <Title order={1}>DMX Light Control</Title>
      <ThemeToggle ml="auto" mr="md" />
    </Flex>
  );
};

export default Header;
