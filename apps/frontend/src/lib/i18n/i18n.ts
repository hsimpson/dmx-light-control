import de from '@/lang/de.json';
import en from '@/lang/en.json';
import { Config } from 'next-i18n-router/dist/types';

export const i18nConfig: Config = {
  locales: ['de', 'en'],
  defaultLocale: 'de',
  prefixDefault: true,
};

const messages = {
  de,
  en,
} as const;

export const getLocalizedMessages = (locale = '') => {
  const verifiedLocale = (
    Object.hasOwn(messages, locale) ? locale : i18nConfig.defaultLocale
  ) as keyof typeof messages;
  return { messages: messages[verifiedLocale], locale: verifiedLocale };
};
