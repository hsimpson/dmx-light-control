import { CombinedGraphQLErrors } from '@apollo/client';

/** The first GraphQL error message (e.g. an import conflict), otherwise the translated fallback. */
export function importErrorMessage(error: unknown, fallback: string): string {
  if (CombinedGraphQLErrors.is(error)) {
    const message = error.errors.find(graphQLError => graphQLError.message)?.message;
    if (message) {
      return message;
    }
  }
  return fallback;
}
