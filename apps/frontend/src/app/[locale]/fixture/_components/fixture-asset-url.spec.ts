import { describe, expect, it } from 'vitest';
import { fixtureAssetDisplayUrl, fixtureAssetUploadUrl } from './fixture-asset-url';

describe('fixture asset URLs', () => {
  it('falls back to the default path when the fixture has no asset', () => {
    expect(
      fixtureAssetDisplayUrl(null, '/assets/fixtures/_defaults/picture.webp', 'http://localhost:3000/graphql'),
    ).toBe('http://localhost:3000/assets/fixtures/_defaults/picture.webp');
  });

  it('builds the REST upload URL from the GraphQL origin', () => {
    expect(fixtureAssetUploadUrl('fix-1', 'picture', 'http://localhost:3000/graphql')).toBe(
      'http://localhost:3000/fixtures/fix-1/assets/picture',
    );
  });
});
