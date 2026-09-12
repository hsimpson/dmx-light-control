'use client';

import { ICON_SIZE } from '@/lib/constants';
import { DmxSocketConnector } from '@/lib/dmx/dmx-socket-connector';
import { useTranslation } from '@/lib/i18n/use-translation';
import { ActionIcon, AppShell, Burger } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { SidebarSimpleIcon } from '@phosphor-icons/react';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import Header from './header';
import NavBar from './navbar';

type AppProperties = {
  children: ReactNode;
};

const App = ({ children }: AppProperties) => {
  const { t } = useTranslation();
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  const pathname = usePathname();
  const isConsolePopout = /\/project\/[^/]+\/console\/popout\/?$/.test(pathname);
  const isVirtualConsole = /\/project\/[^/]+\/console\/?$/.test(pathname);

  if (isConsolePopout) {
    return (
      <>
        <DmxSocketConnector />
        {children}
      </>
    );
  }

  return (
    <AppShell
      padding="md"
      styles={{
        root: { height: '100dvh', minHeight: '100dvh', overflow: 'hidden' },
        main: {
          display: 'flex',
          flexDirection: 'column',
          height: '100dvh',
          minHeight: 0,
          overflow: isVirtualConsole ? 'hidden' : 'auto',
          ...(isVirtualConsole ? { paddingBottom: 0 } : {}),
        },
      }}
      header={{ height: 60 }}
      navbar={{
        width: 250,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
    >
      <DmxSocketConnector />
      <AppShell.Header>
        <Header
          leading={
            <>
              <Burger
                hiddenFrom="sm"
                opened={mobileOpened}
                size="sm"
                aria-label={t({ id: 'NavBar.menu', defaultMessage: 'Menu' })}
                onClick={toggleMobile}
              />
              <ActionIcon
                aria-expanded={desktopOpened}
                aria-label={
                  desktopOpened
                    ? t({ id: 'NavBar.collapseNavigation', defaultMessage: 'Collapse navigation' })
                    : t({ id: 'NavBar.expandNavigation', defaultMessage: 'Expand navigation' })
                }
                variant="subtle"
                visibleFrom="sm"
                onClick={toggleDesktop}
              >
                <SidebarSimpleIcon size={ICON_SIZE} weight="duotone" />
              </ActionIcon>
            </>
          }
        />
      </AppShell.Header>

      <AppShell.Navbar>
        <NavBar />
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
};

export default App;
