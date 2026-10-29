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

export type DmxWsFunctionMessage = {
  type: 'functionStart' | 'functionStop';
  functionPublicId: string;
};

export type DmxWsFunctionStateMessage = {
  type: 'functionState';
  running: string[];
};

export type DmxWsMidiInputMessage = {
  type: 'midiInput';
  portName: string;
  message: number[];
};

export type DmxWsClientMessage = DmxWsSetMessage | DmxWsFunctionMessage;

export function dmxWsSnapshotMessage(channels: number[]): DmxWsSnapshotMessage {
  return { type: 'snapshot', channels };
}

export function dmxWsDeltaMessage(values: DmxValue[]): DmxWsDeltaMessage {
  return { type: 'delta', values };
}

export function dmxWsFunctionStateMessage(running: string[]): DmxWsFunctionStateMessage {
  return { type: 'functionState', running };
}

export function dmxWsMidiInputMessage(portName: string, message: readonly number[]): DmxWsMidiInputMessage {
  return { type: 'midiInput', portName, message: [...message] };
}

export function parseDmxWsClientMessage(raw: string): DmxWsClientMessage | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return undefined;
  }
  const message = parsed as { type?: unknown; values?: unknown; functionPublicId?: unknown };
  if (message.type === 'functionStart' || message.type === 'functionStop') {
    if (typeof message.functionPublicId !== 'string' || message.functionPublicId.length === 0) {
      return undefined;
    }
    return { type: message.type, functionPublicId: message.functionPublicId };
  }
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
  return { type: 'set', values };
}

export function parseDmxWsSetMessage(raw: string): DmxValue[] | undefined {
  const message = parseDmxWsClientMessage(raw);
  if (message?.type !== 'set') {
    return undefined;
  }
  return message.values;
}
