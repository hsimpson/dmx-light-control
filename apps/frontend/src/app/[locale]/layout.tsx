import App from '@/components/app';
import { APP_NAME } from '@/lib/constants';
import ApolloWrapper from '@/lib/graphql/apollo-wrapper';
import IntlWrapper from '@/lib/i18n/intl-wrapper';
import { ColorSchemeScript, mantineHtmlProps, MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { Notifications } from '@mantine/notifications';

// mantine styles
import '@mantine/notifications/styles.css';
// ‼️ import notifications styles after core package styles
import 'mantine-datatable/styles.layer.css';

import { ReactNode } from 'react';

export const metadata = {
  title: APP_NAME,
};

type LayoutProperties = {
  params: Promise<{ locale: string }>;
  children: ReactNode;
};

const RootLayout = async ({ params, children }: LayoutProperties) => {
  const { locale } = await params;

  return (
    <html lang={locale} {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <ApolloWrapper>
          <IntlWrapper locale={locale}>
            <MantineProvider defaultColorScheme="light">
              <Notifications />
              <App>{children}</App>
            </MantineProvider>
          </IntlWrapper>
        </ApolloWrapper>
      </body>
    </html>
  );
};

export default RootLayout;
