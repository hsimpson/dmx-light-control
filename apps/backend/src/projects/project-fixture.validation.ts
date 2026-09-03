import {
  ChannelModeFixtureMismatchException,
  DmxAddressOutOfRangeException,
  EmptyChannelModeException,
  ProjectFixtureAddressOverlapException,
} from '@/projects/project.exceptions';

export type OccupiedPatch = {
  startAddress: number;
  channelCount: number;
};

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

export function dmxRangesOverlap(
  startAddress: number,
  channelCount: number,
  otherStartAddress: number,
  otherChannelCount: number,
): boolean {
  if (channelCount <= 0 || otherChannelCount <= 0) {
    return false;
  }

  const endAddress = startAddress + channelCount - 1;
  const otherEndAddress = otherStartAddress + otherChannelCount - 1;
  return startAddress <= otherEndAddress && otherStartAddress <= endAddress;
}

export function assertNoPatchOverlap(startAddress: number, channelCount: number, occupied: OccupiedPatch[]): void {
  const conflict = occupied.find(other =>
    dmxRangesOverlap(startAddress, channelCount, other.startAddress, other.channelCount),
  );
  if (conflict) {
    throw new ProjectFixtureAddressOverlapException(
      startAddress,
      channelCount,
      conflict.startAddress,
      conflict.channelCount,
    );
  }
}
