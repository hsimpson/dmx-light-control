import { describe, expect, it } from 'vitest';
import { fixtureAssetServedPath, isFixtureAssetKind, slugifyAssetSegment } from './fixture-asset-path';

describe('slugifyAssetSegment', () => {
  it('slugifies vendor and fixture display names', () => {
    expect(slugifyAssetSegment('American DJ')).toBe('american-dj');
    expect(slugifyAssetSegment('Spot 150')).toBe('spot-150');
  });

  it('rejects path traversal and reserved names', () => {
    expect(slugifyAssetSegment('..')).toBe('unnamed');
    expect(slugifyAssetSegment('_defaults')).toBe('defaults');
    expect(slugifyAssetSegment('../etc/passwd')).toBe('etc-passwd');
  });
});

describe('fixtureAssetServedPath', () => {
  it('builds a URL path under /assets/fixtures', () => {
    expect(fixtureAssetServedPath('Acme', 'Spot 250', 'picture.webp')).toBe(
      '/assets/fixtures/acme/spot-250/picture.webp',
    );
  });
});

describe('isFixtureAssetKind', () => {
  it('accepts known kinds only', () => {
    expect(isFixtureAssetKind('picture')).toBe(true);
    expect(isFixtureAssetKind('logo')).toBe(false);
  });
});
