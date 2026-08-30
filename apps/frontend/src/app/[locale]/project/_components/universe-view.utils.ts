import { DMX_CHANNELS_PER_ROW } from './universe-channel-square';

type FixtureRowSegment = {
  gridColumn: number;
  gridRow: number;
  columnSpan: number;
};

export type FixtureLabelPlacement = FixtureRowSegment & {
  fixtureNumber: number;
  name: string;
  fixtureVariant: 0 | 1;
};

export function getFixtureRowSegments(startAddress: number, channelCount: number): FixtureRowSegment[] {
  const segments: FixtureRowSegment[] = [];
  let remaining = channelCount;
  let channel = startAddress;

  while (remaining > 0) {
    const columnIndex = (channel - 1) % DMX_CHANNELS_PER_ROW;
    const channelsUntilRowEnd = DMX_CHANNELS_PER_ROW - columnIndex;
    const columnSpan = Math.min(remaining, channelsUntilRowEnd);

    segments.push({
      gridColumn: columnIndex + 1,
      gridRow: Math.floor((channel - 1) / DMX_CHANNELS_PER_ROW) + 1,
      columnSpan,
    });

    remaining -= columnSpan;
    channel += columnSpan;
  }

  return segments;
}

export function buildFixtureLabelPlacements<
  T extends { publicId: string; startAddress: number; fixture: { name: string } },
>(projectFixtures: T[], getChannelCount: (fixture: T) => number): FixtureLabelPlacement[] {
  const sortedFixtures = [...projectFixtures].sort(
    (left, right) => left.startAddress - right.startAddress || left.publicId.localeCompare(right.publicId),
  );

  return sortedFixtures.flatMap((fixture, fixtureIndex) => {
    const [firstSegment] = getFixtureRowSegments(fixture.startAddress, getChannelCount(fixture));

    if (!firstSegment) {
      return [];
    }

    return [
      {
        fixtureNumber: fixtureIndex + 1,
        name: fixture.fixture.name,
        fixtureVariant: (fixtureIndex % 2) as 0 | 1,
        ...firstSegment,
      },
    ];
  });
}
