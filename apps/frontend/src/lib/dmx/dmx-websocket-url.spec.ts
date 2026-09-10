import { describe, expect, it } from 'vitest';
import { dmxWebSocketUrl } from './dmx-websocket-url';

describe('dmxWebSocketUrl', () => {
  it('maps the GraphQL HTTP URL to ws /dmx', () => {
    expect(dmxWebSocketUrl('http://localhost:3000/graphql')).toBe('ws://localhost:3000/dmx');
    expect(dmxWebSocketUrl('https://example.test/graphql')).toBe('wss://example.test/dmx');
  });
});
