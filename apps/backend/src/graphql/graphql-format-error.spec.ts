import { GraphQLFormattedError } from 'graphql';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { formatErrorHandler } from './graphql-format-error';

describe('formatErrorHandler', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('returns the formatted error unchanged outside production', () => {
    process.env.NODE_ENV = 'development';

    const formattedError: GraphQLFormattedError = {
      message: 'Something went wrong',
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        stacktrace: ['Error: Something went wrong'],
      },
    };

    expect(formatErrorHandler(formattedError)).toBe(formattedError);
  });

  it('strips stacktrace from extensions in production', () => {
    process.env.NODE_ENV = 'production';

    const formattedError: GraphQLFormattedError = {
      message: 'Something went wrong',
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        stacktrace: ['Error: Something went wrong'],
        http: { status: 500 },
      },
    };

    expect(formatErrorHandler(formattedError)).toEqual({
      message: 'Something went wrong',
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        http: { status: 500 },
      },
    });
  });

  it('returns the formatted error unchanged in production when extensions are missing', () => {
    process.env.NODE_ENV = 'production';

    const formattedError: GraphQLFormattedError = {
      message: 'Something went wrong',
    };

    expect(formatErrorHandler(formattedError)).toEqual({
      message: 'Something went wrong',
      extensions: {},
    });
  });
});
