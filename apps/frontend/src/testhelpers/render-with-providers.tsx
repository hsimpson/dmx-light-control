import { getLocalizedMessages } from '@/lib/i18n/i18n';
import { MockLink } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { MantineProvider } from '@mantine/core';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactElement, ReactNode } from 'react';
import { IntlProvider } from 'react-intl';

export type RenderWithProvidersOptions = Omit<RenderOptions, 'wrapper'> & {
  apolloMocks?: readonly MockLink.MockedResponse[];
};

export const renderWithProviders = (ui: ReactElement, options: RenderWithProvidersOptions = {}) => {
  const { apolloMocks, ...renderOptions } = options;
  const localizedMessages = getLocalizedMessages('en');

  const Wrapper = ({ children }: { children: ReactNode }) => {
    const providers = (
      <MantineProvider>
        <IntlProvider defaultLocale="en" {...localizedMessages}>
          {children}
        </IntlProvider>
      </MantineProvider>
    );

    if (!apolloMocks) {
      return providers;
    }

    return <MockedProvider mocks={apolloMocks}>{providers}</MockedProvider>;
  };

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
};

export { userEvent };
