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
      // eslint-disable-next-line no-console
      console.warn('[GraphQL error]:', error_);
    }
  } else {
    // eslint-disable-next-line no-console
    console.error('GraphQL error:', error);
  }
});

export const graphqlClient = new ApolloClient({
  cache: new InMemoryCache({
    // Every entity in this schema extends BaseDto and is identified by `publicId`.
    // Key cached objects by `publicId` when present, falling back to `id` for
    // any type that does not use the BaseDto convention.
    dataIdFromObject: object => {
      const obj = object as {
        __typename?: string;
        id?: string | number | null | undefined;
        publicId?: string | number | null | undefined;
      };
      const typename = obj.__typename;
      if (typename === undefined) {
        return undefined;
      }
      if (obj.publicId !== null && obj.publicId !== undefined) {
        return `${typename}:${obj.publicId}`;
      }
      if (obj.id !== null && obj.id !== undefined) {
        return `${typename}:${obj.id}`;
      }
      return undefined;
    },
  }),
  link: ApolloLink.from([errorLink, httpLink]),
});
