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
    expect(parseDmxWsSetMessage(JSON.stringify(null))).toBeUndefined();
    expect(parseDmxWsSetMessage(JSON.stringify({ type: 'set', values: 'bad' }))).toBeUndefined();
  });

  it('skips invalid value entries and keeps valid ones', () => {
    expect(
      parseDmxWsSetMessage(
        JSON.stringify({
          type: 'set',
          values: [{ channel: 1, value: 10 }, null, { channel: '2', value: 20 }, { channel: 3, value: 30 }],
        }),
      ),
    ).toEqual([
      { channel: 1, value: 10 },
      { channel: 3, value: 30 },
    ]);
  });
});
