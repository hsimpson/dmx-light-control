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
  control: Pick<VirtualConsoleControl, 'type' | 'valueType'>,
  rawValue: number,
): number => {
  const scaled =
    control.type === 'slider' && control.valueType === 'percentage' ? (rawValue / 100) * DMX_MAX : rawValue;
  return Math.min(DMX_MAX, Math.max(0, Math.round(scaled)));
};

export const dmxChannelUpdates = (
  control: VirtualConsoleControl,
  rawValue: number,
  fixtures: readonly VirtualConsoleBoundFixture[],
): { channel: number; value: number }[] => {
  const value = controlToDmxValue(control, rawValue);
  const updates: { channel: number; value: number }[] = [];
  for (const binding of control.channelBindings ?? []) {
    const fixture = fixtures.find(candidate => candidate.publicId === binding.projectFixturePublicId);
    const assignment = fixture?.channelMode.fixtureChannelAssignments.find(
      candidate => candidate.publicId === binding.channelAssignmentPublicId,
    );
    if (!fixture || !assignment) {
      continue;
    }
    const channel = fixture.startAddress + assignment.channelNumber - 1;
    if (channel < 1 || channel > DMX_UNIVERSE_SIZE) {
      continue;
    }
    updates.push({ channel, value });
  }
  return updates;
};

export const publishVirtualConsoleValue = (
  control: VirtualConsoleControl,
  rawValue: number,
  fixtures: readonly VirtualConsoleBoundFixture[],
): void => {
  const updates = dmxChannelUpdates(control, rawValue, fixtures);
  if (updates.length === 0) {
    return;
  }
  getDmxWebsocketClient()?.setChannels(updates);
};
