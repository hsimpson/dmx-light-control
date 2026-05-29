import { NavLink } from '@mantine/core';

const NavBar = () => {
  return (
    <>
      <NavLink label="Home" href="/admin" />
      <NavLink label="Fixtures" href="/admin/fixture/list" />
    </>
  );
};

export default NavBar;
