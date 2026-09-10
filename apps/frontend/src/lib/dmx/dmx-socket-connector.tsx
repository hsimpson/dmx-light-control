'use client';

import { useEffect } from 'react';
import { dmxStore } from './dmx-store';
import { DmxWebsocketClient } from './dmx-websocket-client';
import { dmxWebSocketUrl } from './dmx-websocket-url';

let client: DmxWebsocketClient | undefined;

export function DmxSocketConnector() {
  useEffect(() => {
    const url = dmxWebSocketUrl();
    if (!url || typeof WebSocket === 'undefined') {
      return undefined;
    }
    client?.disconnect();
    client = new DmxWebsocketClient(dmxStore, url, WebSocket);
    client.connect();
    return () => {
      client?.disconnect();
      client = undefined;
    };
  }, []);

  return null;
}

export function getDmxWebsocketClient(): DmxWebsocketClient | undefined {
  return client;
}
