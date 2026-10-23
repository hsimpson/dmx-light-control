import { getDmxWebsocketClient } from '@/lib/dmx/dmx-socket-connector';
import type { VirtualConsoleControl } from './virtual-console-document';

const DMX_MAX = 255;
const DMX_UNIVERSE_SIZE = 512;

export type VirtualConsoleBoundFixture = {
  publicId: string;
  startAddress: number;
  channelMode: {
    fixtureChannelAssignments: { publicId: string; channelNumber: number }[];
  };
};

export const controlToDmxValue = (
  control: Pick<VirtualConsoleControl, 'type' | 'valueType' | 'lowerLimit' | 'upperLimit'>,
  rawValue: number,
): number => {
  const lowerLimit = control.lowerLimit ?? 0;
  const upperLimit = control.upperLimit ?? DMX_MAX;
  const scaled =
    control.type === 'slider' && control.valueType === 'percentage'
      ? lowerLimit + (rawValue / 100) * (upperLimit - lowerLimit)
      : rawValue;
  return Math.min(DMX_MAX, Math.max(0, Math.round(scaled)));
};

export const resolveBindingChannel = (
  binding: { projectFixturePublicId: string; channelAssignmentPublicId: string },
  fixtures: readonly VirtualConsoleBoundFixture[],
): number | undefined => {
  const fixture = fixtures.find(candidate => candidate.publicId === binding.projectFixturePublicId);
  const assignment = fixture?.channelMode.fixtureChannelAssignments.find(
    candidate => candidate.publicId === binding.channelAssignmentPublicId,
  );
  if (!fixture || !assignment) {
    return undefined;
  }
  const channel = fixture.startAddress + assignment.channelNumber - 1;
  if (channel < 1 || channel > DMX_UNIVERSE_SIZE) {
    return undefined;
  }
  return channel;
};

type ConsoleControlTree = {
  channelBindings?: readonly { projectFixturePublicId: string; channelAssignmentPublicId: string }[] | null;
  children?: readonly ConsoleControlTree[] | null;
};

export const virtualConsoleBoundChannels = (
  pages: readonly { controls: readonly ConsoleControlTree[] }[] | null | undefined,
  fixtures: readonly VirtualConsoleBoundFixture[],
): number[] => {
  const channels = new Set<number>();
  const visit = (control: ConsoleControlTree) => {
    for (const binding of control.channelBindings ?? []) {
      const channel = resolveBindingChannel(binding, fixtures);
      if (channel !== undefined) {
        channels.add(channel);
      }
    }
    for (const child of control.children ?? []) {
      visit(child);
    }
  };
  for (const page of pages ?? []) {
    for (const control of page.controls) {
      visit(control);
    }
  }
  return [...channels].sort((left, right) => left - right);
};

export const dmxChannelUpdates = (
  control: VirtualConsoleControl,
  rawValue: number,
  fixtures: readonly VirtualConsoleBoundFixture[],
): { channel: number; value: number }[] => {
  const value = controlToDmxValue(control, rawValue);
  const updates: { channel: number; value: number }[] = [];
  for (const binding of control.channelBindings ?? []) {
    const channel = resolveBindingChannel(binding, fixtures);
    if (channel !== undefined) {
      updates.push({ channel, value });
    }
  }
  return updates;
};

type ChannelContribution = {
  channels: Set<number>;
  value: number;
};

const contributions = new Map<string, ChannelContribution>();

export const resetVirtualConsoleChannelOutput = (): void => {
  contributions.clear();
};

const rememberContribution = (controlId: string, updates: { channel: number; value: number }[]): void => {
  const [first] = updates;
  if (!first) {
    contributions.delete(controlId);
    return;
  }
  contributions.set(controlId, {
    channels: new Set(updates.map(update => update.channel)),
    value: first.value,
  });
};

const heldLevel = (channel: number): number => {
  let level = 0;
  for (const contribution of contributions.values()) {
    if (contribution.channels.has(channel)) {
      level = Math.max(level, contribution.value);
    }
  }
  return level;
};

export const publishVirtualConsoleValue = (
  control: VirtualConsoleControl,
  rawValue: number,
  fixtures: readonly VirtualConsoleBoundFixture[],
): void => {
  const updates = dmxChannelUpdates(control, rawValue, fixtures);
  rememberContribution(control.id, updates);
  if (updates.length === 0) {
    return;
  }
  const output =
    control.type === 'button' && updates.every(update => update.value === 0)
      ? updates.map(update => ({ channel: update.channel, value: heldLevel(update.channel) }))
      : updates;
  getDmxWebsocketClient()?.setChannels(output);
};
