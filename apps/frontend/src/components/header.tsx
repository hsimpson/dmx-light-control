import { Flex, Title } from '@mantine/core';

const Header = () => {
  return (
    <Flex
      mih={60}
      gap="md"
      justify="flex-start"
      align="center"
      direction="row"
      wrap="wrap"
    >
      <img
        src="/images/logo.svg"
        width={44}
        height={44}
        alt="DMX Light Control logo"
        role="img"
      />
      <Title order={1}>DMX Light Control</Title>
    </Flex>
  );
};

export default Header;
