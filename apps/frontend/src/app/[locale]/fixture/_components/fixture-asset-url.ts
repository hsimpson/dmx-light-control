import { graphqlApiOrigin, sceneAssetUrl } from '@/lib/graphql/graphql-api-origin';

export const FIXTURE_DEFAULT_PICTURE_PATH = '/assets/fixtures/_defaults/picture.webp';
export const FIXTURE_DEFAULT_PICTURE_2D_PATH = '/assets/fixtures/_defaults/picture-2d.svg';
export const FIXTURE_DEFAULT_MODEL_3D_PATH = '/assets/fixtures/_defaults/model.glb';

export type FixtureAssetKind = 'picture' | 'picture2d' | 'model3d';

export function fixtureAssetDisplayUrl(path: string | null | undefined, fallback: string, graphqlUrl?: string): string {
  return sceneAssetUrl(path ?? fallback, graphqlUrl);
}

export function fixtureAssetUploadUrl(publicId: string, kind: FixtureAssetKind, graphqlUrl?: string): string {
  return `${graphqlApiOrigin(graphqlUrl)}/fixtures/${publicId}/assets/${kind}`;
}
