import { ICON_SIZE } from '@/lib/constants';
import { NavLink } from '@mantine/core';
import { HeadlightsIcon, HouseIcon } from '@phosphor-icons/react';

const NavBar = () => {
  return (
    <>
      <NavLink label="Home" href="/" leftSection={<HouseIcon size={ICON_SIZE} weight="duotone" />} />
      <NavLink
        label="Fixtures"
        href="/fixture/list"
        leftSection={<HeadlightsIcon size={ICON_SIZE} weight="duotone" />}
      />
    </>
  );
};

export default NavBar;
