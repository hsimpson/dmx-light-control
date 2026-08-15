import de from '@/lang/de.json';
import en from '@/lang/en.json';
import { describe, expect, it } from 'vitest';
import { getLocalizedMessages, i18nConfig } from './i18n';

describe('getLocalizedMessages', () => {
  it('returns English messages for locale en', () => {
    expect(getLocalizedMessages('en')).toEqual({ messages: en, locale: 'en' });
  });

  it('falls back to the default locale for an unknown locale', () => {
    expect(getLocalizedMessages('fr')).toEqual({ messages: de, locale: i18nConfig.defaultLocale });
  });

  it('falls back to the default locale for an empty locale', () => {
    expect(getLocalizedMessages('')).toEqual({ messages: de, locale: 'de' });
  });
});
