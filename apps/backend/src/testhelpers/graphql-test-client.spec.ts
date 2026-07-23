import { parse, print } from 'graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { graphqlQuery } from './graphql-test-client';

const { mockExpect, mockSend, mockPost, mockRequest } = vi.hoisted(() => {
  const expectFn = vi.fn();
  const send = vi.fn().mockReturnValue({ expect: expectFn });
  const post = vi.fn().mockReturnValue({ send });
  const request = vi.fn().mockReturnValue({ post });

  return {
    mockExpect: expectFn,
    mockSend: send,
    mockPost: post,
    mockRequest: request,
  };
});

vi.mock('supertest', () => ({
  default: mockRequest,
}));

describe('graphqlQuery', () => {
  const app = {} as Parameters<typeof graphqlQuery>[0];

  beforeEach(() => {
    vi.clearAllMocks();
    mockExpect.mockResolvedValue({
      body: {
        data: { hello: 'world' },
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('posts a string query to /graphql and returns the response body', async () => {
    const query = 'query { hello }';

    const result = await graphqlQuery<{ hello: string }>(app, query);

    expect(mockRequest).toHaveBeenCalledWith(app);
    expect(mockPost).toHaveBeenCalledWith('/graphql');
    expect(mockSend).toHaveBeenCalledWith({ query, variables: undefined });
    expect(mockExpect).toHaveBeenCalledWith(200);
    expect(result).toEqual({ data: { hello: 'world' } });
  });

  it('prints a DocumentNode query before sending', async () => {
    const query = parse('query { hello }');

    await graphqlQuery(app, query);

    expect(mockSend).toHaveBeenCalledWith({
      query: print(query),
      variables: undefined,
    });
  });

  it('passes variables and a custom expected status', async () => {
    const query = 'query ($id: ID!) { item(id: $id) { id } }';
    const variables = { id: '123' };

    await graphqlQuery(app, query, { variables, expectedStatus: 400 });

    expect(mockSend).toHaveBeenCalledWith({ query, variables });
    expect(mockExpect).toHaveBeenCalledWith(400);
  });
});
