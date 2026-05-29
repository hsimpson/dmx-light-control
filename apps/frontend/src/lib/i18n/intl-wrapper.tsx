'use client';

import { IntlProvider } from 'react-intl';
import { getLocalizedMessages } from './i18n';

type IntlWrapperProperties = {
  locale: string;
  children: React.ReactNode;
};

const IntlWrapper = ({ locale, children }: IntlWrapperProperties) => {
  const localizedMessages = getLocalizedMessages(locale);

  return (
    <IntlProvider defaultLocale="en" {...localizedMessages}>
      {children}
    </IntlProvider>
  );
};

export default IntlWrapper;
