import {
  ApolloClient,
  ApolloLink,
  CombinedGraphQLErrors,
  CombinedProtocolErrors,
  HttpLink,
  InMemoryCache,
} from '@apollo/client';
import { ErrorLink } from '@apollo/client/link/error';

const httpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_API_URL,
  fetchOptions: {
    // you can pass additional options that should be passed to `fetch` here,
    // e.g. Next.js-related `fetch` options regarding caching and revalidation
    // see https://nextjs.org/docs/app/api-reference/functions/fetch#fetchurl-options
  },
});

const errorLink = new ErrorLink(({ error }) => {
  if (CombinedGraphQLErrors.is(error) || CombinedProtocolErrors.is(error)) {
    for (const error_ of error.errors) {
      console.log('[GraphQL error]:', error_);
    }
  } else {
    console.error('GraphQL error:', error);
  }
});

export const graphqlClient = new ApolloClient({
  cache: new InMemoryCache(),
  link: ApolloLink.from([errorLink, httpLink]),
});
