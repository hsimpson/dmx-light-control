import {
  ChannelModeFixtureMismatchException,
  DmxAddressOutOfRangeException,
  EmptyChannelModeException,
} from '@/projects/project.exceptions';

export type ChannelModeWithAssignments = {
  fixtureId: number;
  fixtureChannelAssignments: { channelNumber: number }[];
};

export function channelCountFromMode(mode: { fixtureChannelAssignments: { channelNumber: number }[] }): number {
  if (mode.fixtureChannelAssignments.length === 0) {
    return 0;
  }
  return Math.max(...mode.fixtureChannelAssignments.map(assignment => assignment.channelNumber));
}

export function assertChannelModeBelongsToFixture(mode: ChannelModeWithAssignments, fixtureId: number): void {
  if (mode.fixtureId !== fixtureId) {
    throw new ChannelModeFixtureMismatchException();
  }
}

export function assertValidPatchAddress(
  startAddress: number,
  mode: { fixtureChannelAssignments: { channelNumber: number }[] },
): void {
  const channelCount = channelCountFromMode(mode);
  if (channelCount === 0) {
    throw new EmptyChannelModeException();
  }
  if (startAddress + channelCount - 1 > 512) {
    throw new DmxAddressOutOfRangeException(startAddress, channelCount);
  }
}
