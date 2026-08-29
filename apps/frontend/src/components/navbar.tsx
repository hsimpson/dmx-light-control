import { ICON_SIZE } from '@/lib/constants';
import { useTranslation } from '@/lib/i18n/use-translation';
import { NavLink } from '@mantine/core';
import { FactoryIcon, FolderIcon, HeadlightsIcon, HouseIcon } from '@phosphor-icons/react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const DETAIL_PATH_PATTERN = /^\/(project|fixture)\/([^/]+)$/;

type SectionNavLinkProperties = {
  label: string;
  listHref: string;
  listActive: boolean;
  sectionActive: boolean;
  detailHref?: string;
  detailLabel?: string;
  leftSection: ReactNode;
};

const SectionNavLink = ({
  label,
  listHref,
  listActive,
  sectionActive,
  detailHref,
  detailLabel,
  leftSection,
}: SectionNavLinkProperties) => {
  const { t } = useTranslation();

  if (!detailHref) {
    return <NavLink label={label} href={listHref} active={sectionActive} leftSection={leftSection} />;
  }

  return (
    <NavLink label={label} href={listHref} active={sectionActive} opened childrenOffset={28} leftSection={leftSection}>
      <NavLink label={t({ id: 'NavBar.List', defaultMessage: 'List' })} href={listHref} active={listActive} />
      <NavLink label={detailLabel} href={detailHref} active />
    </NavLink>
  );
};

const NavBar = () => {
  const { t } = useTranslation();
  const pathname = usePathname();
  const currentPath = pathname.replace(/^\/(en|de)(?=\/|$)/, '') || '/';
  const detailMatch = DETAIL_PATH_PATTERN.exec(currentPath);
  const detailSection = detailMatch?.[1];
  const detailPublicId = detailMatch?.[2];
  const isProjectDetail = detailSection === 'project' && detailPublicId !== 'list';
  const isFixtureDetail = detailSection === 'fixture' && detailPublicId !== 'list' && detailPublicId !== 'new';
  const isProjectSection = currentPath.startsWith('/project');
  const isFixtureSection = currentPath === '/fixture' || currentPath.startsWith('/fixture/');

  return (
    <>
      <NavLink
        label={t({ id: 'NavBar.Home', defaultMessage: 'Home' })}
        href="/"
        active={currentPath === '/'}
        leftSection={<HouseIcon size={ICON_SIZE} weight="duotone" />}
      />
      <SectionNavLink
        label={t({ id: 'NavBar.Projects', defaultMessage: 'Projects' })}
        listHref="/project/list"
        listActive={currentPath === '/project/list' || currentPath === '/project'}
        sectionActive={isProjectSection}
        detailHref={isProjectDetail ? `/project/${detailPublicId}` : undefined}
        detailLabel={t({ id: 'NavBar.ProjectDetail', defaultMessage: 'Project detail' })}
        leftSection={<FolderIcon size={ICON_SIZE} weight="duotone" />}
      />
      <NavLink
        label={t({ id: 'NavBar.FixtureVendors', defaultMessage: 'Fixture Vendors' })}
        href="/fixtureVendor/list"
        active={currentPath.startsWith('/fixtureVendor')}
        leftSection={<FactoryIcon size={ICON_SIZE} weight="duotone" />}
      />
      <SectionNavLink
        label={t({ id: 'NavBar.Fixtures', defaultMessage: 'Fixtures' })}
        listHref="/fixture/list"
        listActive={currentPath === '/fixture/list' || currentPath === '/fixture'}
        sectionActive={isFixtureSection}
        detailHref={isFixtureDetail ? `/fixture/${detailPublicId}` : undefined}
        detailLabel={t({ id: 'NavBar.FixtureDetail', defaultMessage: 'Fixture detail' })}
        leftSection={<HeadlightsIcon size={ICON_SIZE} weight="duotone" />}
      />
    </>
  );
};

export default NavBar;
