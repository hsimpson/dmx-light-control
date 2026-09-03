export function graphqlApiOrigin(graphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_API_URL): string {
  if (!graphqlUrl) {
    return '';
  }
  return graphqlUrl.replace(/\/graphql\/?$/, '');
}

export function roomGltfUrl(): string {
  return `${graphqlApiOrigin()}/assets/3d/room.gltf?v=slab-0.4`;
}
