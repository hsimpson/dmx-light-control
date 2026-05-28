'use client';

import { ApolloProvider } from '@apollo/client/react';
import { graphqlClient } from './graphql-client';

const ApolloWrapper = ({ children }: { children: React.ReactNode }) => {
  return <ApolloProvider client={graphqlClient}>{children}</ApolloProvider>;
};

export default ApolloWrapper;
