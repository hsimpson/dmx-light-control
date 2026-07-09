import { ICON_SIZE } from '@/lib/constants';
import { useTranslation } from '@/lib/i18n/use-translation';
import { NavLink } from '@mantine/core';
import { FactoryIcon, HeadlightsIcon, HouseIcon } from '@phosphor-icons/react';
import { usePathname } from 'next/navigation';

const NavBar = () => {
  const { t } = useTranslation();
  const pathname = usePathname();
  const currentPath = pathname.replace(/^\/(en|de)(?=\/|$)/, '') || '/';

  return (
    <>
      <NavLink
        label={t({ id: 'NavBar.Home', defaultMessage: 'Home' })}
        href="/"
        active={currentPath === '/'}
        leftSection={<HouseIcon size={ICON_SIZE} weight="duotone" />}
      />
      <NavLink
        label={t({ id: 'NavBar.FixtureVendors', defaultMessage: 'Fixture Vendors' })}
        href="/fixtureVendor/list"
        active={currentPath.startsWith('/fixtureVendor')}
        leftSection={<FactoryIcon size={ICON_SIZE} weight="duotone" />}
      />
      <NavLink
        label={t({ id: 'NavBar.Fixtures', defaultMessage: 'Fixtures' })}
        href="/fixture/list"
        active={currentPath === '/fixture' || currentPath.startsWith('/fixture/')}
        leftSection={<HeadlightsIcon size={ICON_SIZE} weight="duotone" />}
      />
    </>
  );
};

export default NavBar;
