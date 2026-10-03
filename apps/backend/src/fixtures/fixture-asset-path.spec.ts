import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  fixtureAssetColumn,
  fixtureAssetServedPath,
  isFixtureAssetKind,
  resolveAssetsRoot,
  slugifyAssetSegment,
} from './fixture-asset-path';

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

describe('fixtureAssetColumn', () => {
  it('maps each asset kind to its fixture column', () => {
    expect(fixtureAssetColumn('picture')).toBe('picturePath');
    expect(fixtureAssetColumn('picture2d')).toBe('picture2dPath');
    expect(fixtureAssetColumn('model3d')).toBe('model3dPath');
  });
});

describe('resolveAssetsRoot', () => {
  it('uses the source asset tree when that directory exists', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'fixture-assets-'));
    const srcAssets = join(cwd, 'apps/backend/src/assets');
    mkdirSync(srcAssets, { recursive: true });
    expect(resolveAssetsRoot(cwd, '/compiled/assets')).toBe(srcAssets);
  });
});

describe('isFixtureAssetKind', () => {
  it('accepts known kinds only', () => {
    expect(isFixtureAssetKind('picture')).toBe(true);
    expect(isFixtureAssetKind('logo')).toBe(false);
  });
});
