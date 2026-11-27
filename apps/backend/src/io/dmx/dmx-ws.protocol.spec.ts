import { describe, expect, it } from 'vitest';
import { parseDmxWsClientMessage, parseDmxWsSetMessage } from './dmx-ws.protocol';

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

  it('reads function start and stop payloads', () => {
    expect(parseDmxWsClientMessage(JSON.stringify({ type: 'functionStart', functionPublicId: 'abc' }))).toEqual({
      type: 'functionStart',
      functionPublicId: 'abc',
    });
    expect(parseDmxWsClientMessage(JSON.stringify({ type: 'functionStop', functionPublicId: '' }))).toBeUndefined();
  });

  it('GIVEN a control value WHEN parsed THEN keeps a string id and a finite value only', () => {
    expect(parseDmxWsClientMessage(JSON.stringify({ type: 'controlValue', controlId: 'c-1', value: 42 }))).toEqual({
      type: 'controlValue',
      controlId: 'c-1',
      value: 42,
    });
    expect(parseDmxWsClientMessage(JSON.stringify({ type: 'controlValue', controlId: '', value: 1 }))).toBeUndefined();
    expect(
      parseDmxWsClientMessage(JSON.stringify({ type: 'controlValue', controlId: 'c-1', value: '1' })),
    ).toBeUndefined();
    expect(parseDmxWsClientMessage('{"type":"controlValue","controlId":"c-1","value":1e999}')).toBeUndefined();
  });

  it('GIVEN show transport messages WHEN parsed THEN play keeps a valid start position and pause/stop need nothing', () => {
    expect(
      parseDmxWsClientMessage(
        JSON.stringify({ type: 'showPlay', showPublicId: '5f0c1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a5b', fromMs: 1500 }),
      ),
    ).toEqual({
      type: 'showPlay',
      showPublicId: '5f0c1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a5b',
      fromMs: 1500,
    });
    expect(
      parseDmxWsClientMessage(
        JSON.stringify({ type: 'showPlay', showPublicId: '5f0c1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a5b' }),
      ),
    ).toEqual({
      type: 'showPlay',
      showPublicId: '5f0c1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a5b',
    });
    expect(
      parseDmxWsClientMessage(
        JSON.stringify({ type: 'showPlay', showPublicId: '5f0c1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a5b', fromMs: -1 }),
      ),
    ).toBeUndefined();
    expect(parseDmxWsClientMessage(JSON.stringify({ type: 'showPlay', showPublicId: '' }))).toBeUndefined();
    expect(parseDmxWsClientMessage(JSON.stringify({ type: 'showPlay', showPublicId: 'x' }))).toBeUndefined();
    expect(parseDmxWsClientMessage(JSON.stringify({ type: 'showPause' }))).toEqual({ type: 'showPause' });
    expect(parseDmxWsClientMessage(JSON.stringify({ type: 'showStop' }))).toEqual({ type: 'showStop' });
  });
});
