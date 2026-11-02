const DMX_UNIVERSE_SIZE = 512;

export type VirtualConsoleBoundFixture = {
  publicId: string;
  startAddress: number;
  channelMode: {
    fixtureChannelAssignments: { publicId: string; channelNumber: number }[];
  };
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
