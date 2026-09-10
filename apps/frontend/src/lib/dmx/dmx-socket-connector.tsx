'use client';

import { useEffect } from 'react';
import { dmxStore } from './dmx-store';
import { DmxWebsocketClient } from './dmx-websocket-client';
import { dmxWebSocketUrl } from './dmx-websocket-url';

let client: DmxWebsocketClient | undefined;
let holders = 0;
let teardownTimer: ReturnType<typeof setTimeout> | undefined;

function clearTeardownTimer(): void {
  if (teardownTimer !== undefined) {
    clearTimeout(teardownTimer);
    teardownTimer = undefined;
  }
}

function acquireDmxSocket(): void {
  const url = dmxWebSocketUrl();
  if (!url || typeof WebSocket === 'undefined') {
    return;
  }
  holders += 1;
  clearTeardownTimer();
  if (!client) {
    client = new DmxWebsocketClient(dmxStore, url, WebSocket);
    client.connect();
  }
}

function releaseDmxSocket(): void {
  holders = Math.max(0, holders - 1);
  if (holders > 0) {
    return;
  }
  clearTeardownTimer();
  teardownTimer = setTimeout(() => {
    teardownTimer = undefined;
    if (holders === 0) {
      client?.disconnect();
      client = undefined;
    }
  }, 100);
}

export function resetDmxSocketConnector(): void {
  holders = 0;
  clearTeardownTimer();
  client?.disconnect();
  client = undefined;
}

export function DmxSocketConnector() {
  useEffect(() => {
    acquireDmxSocket();
    return () => {
      releaseDmxSocket();
    };
  }, []);

  return null;
}

export function getDmxWebsocketClient(): DmxWebsocketClient | undefined {
  return client;
}
