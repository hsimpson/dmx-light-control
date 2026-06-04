'use client';

import { ICON_SIZE } from '@/lib/constants';
import { ActionIcon, ActionIconProps, useMantineColorScheme } from '@mantine/core';
import { MoonStarsIcon, SunIcon } from '@phosphor-icons/react';
import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {
  //
};

type ThemeToggleProps = Omit<ActionIconProps, 'variant' | 'color' | 'onClick' | 'title' | 'children'>;

const ThemeToggle = (props: ThemeToggleProps) => {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';

  // Use useSyncExternalStore to safely handle client-only rendering
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  if (!mounted) {
    // Return null during SSR to avoid hydration mismatch
    return null;
  }

  return (
    <ActionIcon
      {...props}
      variant="subtle"
      color={dark ? 'yellow' : 'blue'}
      onClick={() => {
        toggleColorScheme();
      }}
      title="Toggle color scheme"
    >
      {dark ? <SunIcon size={ICON_SIZE} /> : <MoonStarsIcon size={ICON_SIZE} />}
    </ActionIcon>
  );
};

export default ThemeToggle;
