'use client';

import { DmxSocketConnector } from '@/lib/dmx/dmx-socket-connector';
import { AppShell, Burger } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import Header from './header';
import NavBar from './navbar';

type AppProperties = {
  children: ReactNode;
};

const App = ({ children }: AppProperties) => {
  const [opened, { toggle }] = useDisclosure();
  const pathname = usePathname();
  const isConsolePopout = /\/project\/[^/]+\/console\/popout\/?$/.test(pathname);

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
        root: { height: '100dvh', minHeight: '100dvh' },
        main: {
          display: 'flex',
          flexDirection: 'column',
          minHeight: 'calc(100dvh - var(--app-shell-header-height, 60px))',
          overflow: 'auto',
        },
      }}
      header={{ height: 60 }}
      navbar={{
        width: 250,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
    >
      <DmxSocketConnector />
      <AppShell.Header>
        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />

        <Header />
      </AppShell.Header>

      <AppShell.Navbar>
        <NavBar />
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
};

export default App;
