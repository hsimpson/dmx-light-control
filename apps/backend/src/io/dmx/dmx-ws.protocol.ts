import { DmxValue } from './types/dmx.types';

export const DMX_WS_PATH = '/dmx';

export type DmxWsSnapshotMessage = {
  type: 'snapshot';
  channels: number[];
};

export type DmxWsDeltaMessage = {
  type: 'delta';
  values: DmxValue[];
};

export type DmxWsSetMessage = {
  type: 'set';
  values: DmxValue[];
};

export function dmxWsSnapshotMessage(channels: number[]): DmxWsSnapshotMessage {
  return { type: 'snapshot', channels };
}

export function dmxWsDeltaMessage(values: DmxValue[]): DmxWsDeltaMessage {
  return { type: 'delta', values };
}

export function parseDmxWsSetMessage(raw: string): DmxValue[] | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return undefined;
  }
  const message = parsed as { type?: unknown; values?: unknown };
  if (message.type !== 'set' || !Array.isArray(message.values)) {
    return undefined;
  }
  const values: DmxValue[] = [];
  for (const entry of message.values) {
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }
    const { channel, value } = entry as { channel?: unknown; value?: unknown };
    if (typeof channel !== 'number' || typeof value !== 'number') {
      continue;
    }
    values.push({ channel, value });
  }
  return values;
}
