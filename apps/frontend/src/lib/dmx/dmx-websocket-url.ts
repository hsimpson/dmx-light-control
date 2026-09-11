import { graphqlApiOrigin } from '@/lib/graphql/graphql-api-origin';

export function dmxWebSocketUrl(graphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_API_URL): string {
  const origin = graphqlApiOrigin(graphqlUrl);
  if (!origin) {
    return '';
  }
  return `${origin.replace(/^http/i, 'ws')}/dmx`;
}
