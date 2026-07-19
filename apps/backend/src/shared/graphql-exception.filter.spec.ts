import { describe, it, expect, vi } from 'vitest';
import { BaseDomainError } from '@/fixtures/fixture.exceptions';
import { ArgumentsHost } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { GlobalGqlExceptionFilter } from './graphql-exception.filter';

function build() {
  const filter = new GlobalGqlExceptionFilter();
  const host = {} as ArgumentsHost;
  return { filter, host };
}

class TestDomainError extends BaseDomainError {
  public override readonly code = 'TEST_CODE';
  public override readonly statusCode = 418;
}

describe('GlobalGqlExceptionFilter', () => {
  it('maps BaseDomainError to a GraphQLError with code + http status', () => {
    const { filter, host } = build();
    const err = new TestDomainError('nope');
    const result = filter.catch(err, host) as GraphQLError;
    expect(result.extensions?.code).toBe('TEST_CODE');
    expect(result.extensions?.http).toEqual({ status: 418 });
  });

  it('maps Nest HttpException 400 to BAD_USER_INPUT', () => {
    const { filter, host } = build();
    const ex = {
      getResponse: () => ({ message: ['bad'], error: 'Bad', statusCode: 400 }),
      getStatus: () => 400,
    };
    const result = filter.catch(ex, host) as GraphQLError;
    expect(result.extensions?.code).toBe('BAD_USER_INPUT');
    expect(result.extensions?.errors).toEqual(['bad']);
  });

  it('falls through to INTERNAL_SERVER_ERROR for non-400 HttpException', () => {
    const { filter, host } = build();
    const ex = {
      getResponse: () => ({ message: 'x', error: 'y', statusCode: 500 }),
      getStatus: () => 500,
    };
    const result = filter.catch(ex, host) as GraphQLError;
    expect(result.extensions?.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('maps a generic Error to INTERNAL_SERVER_ERROR and logs', () => {
    const { filter, host } = build();
    const spy = vi.spyOn((filter as any).logger, 'error').mockImplementation(() => undefined);
    const result = filter.catch(new Error('boom'), host) as GraphQLError;
    expect(result.extensions?.code).toBe('INTERNAL_SERVER_ERROR');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('maps a non-Error to INTERNAL_SERVER_ERROR and logs', () => {
    const { filter, host } = build();
    const spy = vi.spyOn((filter as any).logger, 'error').mockImplementation(() => undefined);
    const result = filter.catch('weird', host) as GraphQLError;
    expect(result.extensions?.code).toBe('INTERNAL_SERVER_ERROR');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('isNestHttpException returns false for null', () => {
    const { filter } = build();
    expect((filter as any).isNestHttpException(null)).toBe(false);
  });

  it('isNestHttpException returns false for object missing functions', () => {
    const { filter } = build();
    expect((filter as any).isNestHttpException({ getResponse: 1 })).toBe(false);
  });

  it('isNestHttpException returns true for valid shape', () => {
    const { filter } = build();
    expect((filter as any).isNestHttpException({ getResponse: () => ({}), getStatus: () => 1 })).toBe(true);
  });
});
