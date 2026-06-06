'use client';

import { ICON_SIZE } from '@/lib/constants';
import { i18nConfig } from '@/lib/i18n/i18n';
import { useTranslation } from '@/lib/i18n/use-translation';
import { ActionIcon, ActionIconProps, Menu } from '@mantine/core';
import { GlobeIcon } from '@phosphor-icons/react';
import Cookies from 'js-cookie';
import { useCurrentLocale } from 'next-i18n-router/client';
import { usePathname } from 'next/navigation';

type LanguageSwitcherProps = Omit<ActionIconProps, 'variant' | 'color' | 'onClick' | 'title' | 'children'>;

const LanguageSwitcher = (props: LanguageSwitcherProps) => {
  const { t } = useTranslation();
  const currentLocale = useCurrentLocale(i18nConfig);
  const pathname = usePathname();

  const handleLanguageChange = (newLocale: string) => {
    if (currentLocale !== newLocale) {
      Cookies.set('NEXT_LOCALE', newLocale);
      // eslint-disable-next-line react-hooks/immutability
      globalThis.location.href = `/${newLocale}${pathname.replace(new RegExp(`^/${currentLocale}`), '')}`;
    }
  };

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'de', label: 'Deutsch' },
  ];

  return (
    <Menu shadow="md" width={200}>
      <Menu.Target>
        <ActionIcon {...props} variant="subtle">
          <GlobeIcon size={ICON_SIZE} />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>{t({ id: 'LanguageSwitcher.language', defaultMessage: 'Language' })}</Menu.Label>
        {languages.map(language => (
          <Menu.CheckboxItem
            key={language.code}
            checked={currentLocale === language.code}
            onClick={() => {
              handleLanguageChange(language.code);
            }}
          >
            {language.label}
          </Menu.CheckboxItem>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
};

export default LanguageSwitcher;
