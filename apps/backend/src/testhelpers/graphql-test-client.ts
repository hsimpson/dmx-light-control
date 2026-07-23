import type { DocumentNode } from 'graphql';
import { print } from 'graphql';
import request, { type Response } from 'supertest';
import type { App } from 'supertest/types';

export type GraphQLResponse<TData> = {
  data?: TData;
  errors?: {
    message: string;
    locations?: { line: number; column: number }[];
    path?: (string | number)[];
  }[];
};

export type GraphQLQueryOptions = {
  variables?: Record<string, unknown>;
  expectedStatus?: number;
};

export async function graphqlQuery<TData>(
  app: App,
  query: string | DocumentNode,
  options: GraphQLQueryOptions = {},
): Promise<GraphQLResponse<TData>> {
  const { variables, expectedStatus = 200 } = options;
  const queryString = typeof query === 'string' ? query : print(query);

  const response: Response = await request(app)
    .post('/graphql')
    .send({ query: queryString, variables })
    .expect(expectedStatus);

  return response.body as GraphQLResponse<TData>;
}
