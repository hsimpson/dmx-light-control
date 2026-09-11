import { describe, expect, it } from 'vitest';
import { parseDmxWsSetMessage } from './dmx-ws.protocol';

describe('parseDmxWsSetMessage', () => {
  it('reads a set payload', () => {
    expect(parseDmxWsSetMessage(JSON.stringify({ type: 'set', values: [{ channel: 1, value: 40 }] }))).toEqual([
      { channel: 1, value: 40 },
    ]);
  });

  it('returns undefined for invalid JSON or type', () => {
    expect(parseDmxWsSetMessage('not-json')).toBeUndefined();
    expect(parseDmxWsSetMessage(JSON.stringify({ type: 'delta', values: [] }))).toBeUndefined();
  });
});
