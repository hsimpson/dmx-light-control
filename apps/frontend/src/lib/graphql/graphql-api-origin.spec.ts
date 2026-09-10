import { describe, expect, it } from 'vitest';
import { graphqlApiOrigin, sceneAssetUrl } from './graphql-api-origin';

describe('graphqlApiOrigin', () => {
  it('strips a trailing /graphql path', () => {
    expect(graphqlApiOrigin('http://localhost:3000/graphql')).toBe('http://localhost:3000');
    expect(graphqlApiOrigin('http://localhost:3000/graphql/')).toBe('http://localhost:3000');
  });
});

describe('sceneAssetUrl', () => {
  it('prefixes the API origin', () => {
    expect(sceneAssetUrl('/assets/3d/light_stand.glb', 'http://localhost:3000/graphql')).toBe(
      'http://localhost:3000/assets/3d/light_stand.glb',
    );
  });
});
