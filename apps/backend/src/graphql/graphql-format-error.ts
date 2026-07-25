import { GraphQLFormattedError } from 'graphql';

export const formatErrorHandler = (formattedError: GraphQLFormattedError): GraphQLFormattedError => {
  if (process.env.NODE_ENV === 'production') {
    const { stacktrace, ...extensions } = formattedError.extensions ?? {};
    return {
      ...formattedError,
      extensions,
    };
  }

  return formattedError;
};
