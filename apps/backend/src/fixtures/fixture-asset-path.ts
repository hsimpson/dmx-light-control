import { existsSync } from 'node:fs';
import { join } from 'node:path';

export const FIXTURE_ASSETS_ROOT = 'FIXTURE_ASSETS_ROOT';

export const FIXTURE_ASSET_KINDS = ['picture', 'picture2d', 'model3d'] as const;
export type FixtureAssetKind = (typeof FIXTURE_ASSET_KINDS)[number];

export const FIXTURE_DEFAULT_PICTURE_PATH = '/assets/fixtures/_defaults/picture.webp';
export const FIXTURE_DEFAULT_PICTURE_2D_PATH = '/assets/fixtures/_defaults/picture-2d.svg';
export const FIXTURE_DEFAULT_MODEL_3D_PATH = '/assets/fixtures/_defaults/model.glb';

export const FIXTURE_ASSET_MAX_BYTES = 20 * 1024 * 1024;

const FILE_STEM: Record<FixtureAssetKind, string> = {
  picture: 'picture',
  picture2d: 'picture-2d',
  model3d: 'model',
};

const EXTENSIONS: Record<FixtureAssetKind, readonly string[]> = {
  picture: ['.jpg', '.jpeg', '.png', '.webp'],
  picture2d: ['.jpg', '.jpeg', '.png', '.webp', '.svg'],
  model3d: ['.glb', '.gltf'],
};

const MIME_TYPES: Record<FixtureAssetKind, readonly string[]> = {
  picture: ['image/jpeg', 'image/png', 'image/webp'],
  picture2d: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
  model3d: ['model/gltf-binary', 'model/gltf+json', 'application/octet-stream', 'application/json'],
};

export function isFixtureAssetKind(value: string): value is FixtureAssetKind {
  return (FIXTURE_ASSET_KINDS as readonly string[]).includes(value);
}

export function slugifyAssetSegment(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replaceAll(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replaceAll(/^-+|-+$/g, '')
    .toLowerCase();
  if (!slug || slug === '_defaults' || slug === '.' || slug === '..') {
    return 'unnamed';
  }
  return slug.slice(0, 80);
}

export function fixtureAssetFileStem(kind: FixtureAssetKind): string {
  return FILE_STEM[kind];
}

export function fixtureAssetAllowedExtensions(kind: FixtureAssetKind): readonly string[] {
  return EXTENSIONS[kind];
}

export function fixtureAssetAllowedMimeTypes(kind: FixtureAssetKind): readonly string[] {
  return MIME_TYPES[kind];
}

export function fixtureAssetServedPath(vendorName: string, fixtureName: string, filename: string): string {
  return `/assets/fixtures/${slugifyAssetSegment(vendorName)}/${slugifyAssetSegment(fixtureName)}/${filename}`;
}

export function resolveAssetsRoot(cwd = process.cwd(), compiledAssetsRoot?: string): string {
  if (process.env.FIXTURE_ASSETS_ROOT) {
    return process.env.FIXTURE_ASSETS_ROOT;
  }
  const srcAssets = join(cwd, 'apps/backend/src/assets');
  if (existsSync(srcAssets)) {
    return srcAssets;
  }
  return compiledAssetsRoot ?? join(cwd, 'dist/apps/backend/assets');
}

export function fixtureAssetColumn(kind: FixtureAssetKind): 'picturePath' | 'picture2dPath' | 'model3dPath' {
  if (kind === 'picture') {
    return 'picturePath';
  }
  if (kind === 'picture2d') {
    return 'picture2dPath';
  }
  return 'model3dPath';
}
