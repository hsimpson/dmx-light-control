import { describe, expect, it } from 'vitest';
import { graphqlApiOrigin } from './graphql-api-origin';

describe('graphqlApiOrigin', () => {
  it('strips a trailing /graphql path', () => {
    expect(graphqlApiOrigin('http://localhost:3000/graphql')).toBe('http://localhost:3000');
    expect(graphqlApiOrigin('http://localhost:3000/graphql/')).toBe('http://localhost:3000');
  });
});
