export function graphqlApiOrigin(graphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_API_URL): string {
  if (!graphqlUrl) {
    return '';
  }
  return graphqlUrl.replace(/\/graphql\/?$/, '');
}

export function roomGltfUrl(): string {
  return sceneAssetUrl('/assets/3d/room.gltf?v=slab-0.7');
}

export function sceneAssetUrl(path: string, graphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_API_URL): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${graphqlApiOrigin(graphqlUrl)}${path}`;
}
