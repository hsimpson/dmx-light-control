import type { DmxValue } from '@/io/dmx/types/dmx.types';
import type { VirtualConsoleChannelBinding, VirtualConsoleControl } from '@/projects/virtual-console';

const DMX_MAX = 255;
const DMX_UNIVERSE_SIZE = 512;

export type VirtualConsoleBoundFixture = {
  publicId: string;
  startAddress: number;
  channelMode: {
    fixtureChannelAssignments: { publicId: string; channelNumber: number }[];
  };
};

export function controlToDmxValue(
  control: Pick<VirtualConsoleControl, 'type' | 'valueType' | 'lowerLimit' | 'upperLimit'>,
  rawValue: number,
): number {
  const lowerLimit = control.lowerLimit ?? 0;
  const upperLimit = control.upperLimit ?? DMX_MAX;
  const scaled =
    control.type === 'slider' && control.valueType === 'percentage'
      ? lowerLimit + (rawValue / 100) * (upperLimit - lowerLimit)
      : rawValue;
  return Math.min(DMX_MAX, Math.max(0, Math.round(scaled)));
}

export function resolveBindingChannel(
  binding: Pick<VirtualConsoleChannelBinding, 'projectFixturePublicId' | 'channelAssignmentPublicId'>,
  fixtures: readonly VirtualConsoleBoundFixture[],
): number | undefined {
  const fixture = fixtures.find(candidate => candidate.publicId === binding.projectFixturePublicId);
  const assignment = fixture?.channelMode.fixtureChannelAssignments.find(
    candidate => candidate.publicId === binding.channelAssignmentPublicId,
  );
  if (!fixture || !assignment) {
    return undefined;
  }
  const channel = fixture.startAddress + assignment.channelNumber - 1;
  return channel >= 1 && channel <= DMX_UNIVERSE_SIZE ? channel : undefined;
}

export function dmxChannelUpdates(
  control: VirtualConsoleControl,
  rawValue: number,
  fixtures: readonly VirtualConsoleBoundFixture[],
): DmxValue[] {
  const value = controlToDmxValue(control, rawValue);
  return (control.channelBindings ?? []).flatMap(binding => {
    const channel = resolveBindingChannel(binding, fixtures);
    return channel === undefined ? [] : [{ channel, value }];
  });
}

type ChannelContribution = {
  channels: Set<number>;
  value: number;
};

/** Remembers each control's level so releasing a button falls back to the highest level still held (HTP). */
export class VirtualConsoleOutput {
  private readonly contributions = new Map<string, ChannelContribution>();

  public apply(control: VirtualConsoleControl, rawValue: number, fixtures: readonly VirtualConsoleBoundFixture[]) {
    const updates = dmxChannelUpdates(control, rawValue, fixtures);
    const [first] = updates;
    if (!first) {
      this.contributions.delete(control.id);
      return [];
    }
    this.contributions.set(control.id, {
      channels: new Set(updates.map(update => update.channel)),
      value: first.value,
    });
    return control.type === 'button' && updates.every(update => update.value === 0)
      ? updates.map(update => ({ channel: update.channel, value: this.heldLevel(update.channel) }))
      : updates;
  }

  private heldLevel(channel: number): number {
    let level = 0;
    for (const contribution of this.contributions.values()) {
      if (contribution.channels.has(channel)) {
        level = Math.max(level, contribution.value);
      }
    }
    return level;
  }
}
