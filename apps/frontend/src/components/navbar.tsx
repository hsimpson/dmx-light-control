import { ICON_SIZE } from '@/lib/constants';
import { useTranslation } from '@/lib/i18n/use-translation';
import { NavLink } from '@mantine/core';
import { FactoryIcon, HeadlightsIcon, HouseIcon } from '@phosphor-icons/react';

const NavBar = () => {
  const { t } = useTranslation();

  return (
    <>
      <NavLink
        label={t({ id: 'NavBar.Home', defaultMessage: 'Home' })}
        href="/"
        leftSection={<HouseIcon size={ICON_SIZE} weight="duotone" />}
      />
      <NavLink
        label={t({ id: 'NavBar.FixtureVendors', defaultMessage: 'Fixture Vendors' })}
        href="/fixtureVendor/list"
        leftSection={<FactoryIcon size={ICON_SIZE} weight="duotone" />}
      />
      <NavLink
        label={t({ id: 'NavBar.Fixtures', defaultMessage: 'Fixtures' })}
        href="/fixture/list"
        leftSection={<HeadlightsIcon size={ICON_SIZE} weight="duotone" />}
      />
    </>
  );
};

export default NavBar;
