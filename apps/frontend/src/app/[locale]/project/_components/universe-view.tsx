'use client';

import { Loading } from '@/components/loading';
import { useTranslation } from '@/lib/i18n/use-translation';
import { FixtureChannelPreset, GetProjectDocument, GetProjectQuery } from '@/shared/types/graphql/graphql';
import { useQuery } from '@apollo/client/react';
import { useMemo, type CSSProperties } from 'react';
import UniverseChannelSquare, { DMX_CHANNELS_PER_ROW, DMX_UNIVERSE_SIZE } from './universe-channel-square';
import { getFixtureRowSegments } from './universe-view.utils';
import classes from './universe-view.module.css';

type ProjectFixture = NonNullable<GetProjectQuery['project']>['projectFixtures'][number];

type ChannelOccupancy = {
  occupied: boolean;
  preset?: FixtureChannelPreset;
  fixtureVariant?: 0 | 1;
  fixtureLabel?: {
    name: string;
    fixtureNumber: number;
    columnSpan: number;
  };
  tooltipLabel: string;
};

type UniverseViewProperties = {
  projectPublicId: string;
};

function fixtureLabel(fixture: ProjectFixture): string {
  return `${fixture.fixture.fixtureVendor.name} – ${fixture.fixture.name}`;
}

function buildChannelOccupancy(projectFixtures: ProjectFixture[]): Map<number, ChannelOccupancy> {
  const occupancy = new Map<number, ChannelOccupancy>();
  const sortedFixtures = [...projectFixtures].sort(
    (left, right) => left.startAddress - right.startAddress || left.publicId.localeCompare(right.publicId),
  );

  sortedFixtures.forEach((fixture, fixtureIndex) => {
    const label = fixtureLabel(fixture);
    const fixtureVariant = (fixtureIndex % 2) as 0 | 1;
    const channelCount = fixture.channelMode.fixtureChannelAssignments.length;
    const [firstSegment] = getFixtureRowSegments(fixture.startAddress, channelCount);

    for (const assignment of fixture.channelMode.fixtureChannelAssignments) {
      const channelNumber = fixture.startAddress + assignment.channelNumber - 1;
      occupancy.set(channelNumber, {
        occupied: true,
        preset: assignment.fixtureChannelDefinition.preset,
        fixtureVariant,
        fixtureLabel:
          assignment.channelNumber === 1 && firstSegment
            ? {
                name: fixture.fixture.name,
                fixtureNumber: fixtureIndex + 1,
                columnSpan: firstSegment.columnSpan,
              }
            : undefined,
        tooltipLabel: `${channelNumber}: ${label}`,
      });
    }
  });

  return occupancy;
}

const UniverseView = ({ projectPublicId }: UniverseViewProperties) => {
  const { t } = useTranslation();
  const { data, loading } = useQuery(GetProjectDocument, {
    variables: { publicId: projectPublicId },
    skip: !projectPublicId,
  });

  const projectFixtures = useMemo(() => data?.project?.projectFixtures ?? [], [data?.project?.projectFixtures]);

  const channelOccupancy = useMemo(() => buildChannelOccupancy(projectFixtures), [projectFixtures]);

  if (loading) {
    return <Loading />;
  }

  const channels = Array.from({ length: DMX_UNIVERSE_SIZE }, (_, index) => index + 1);

  return (
    <div
      className={classes.grid}
      data-testid="universe-view-grid"
      style={{ '--channels-per-row': DMX_CHANNELS_PER_ROW } as CSSProperties}
    >
      {channels.map(channelNumber => {
        const occupancy = channelOccupancy.get(channelNumber);

        return (
          <UniverseChannelSquare
            key={channelNumber}
            channelNumber={channelNumber}
            occupied={occupancy?.occupied ?? false}
            preset={occupancy?.preset}
            fixtureVariant={occupancy?.fixtureVariant}
            fixtureLabel={occupancy?.fixtureLabel}
            tooltipLabel={
              occupancy?.tooltipLabel ??
              t({ id: 'ProjectUniverse.channelTooltip', defaultMessage: 'Channel {channelNumber}' }, { channelNumber })
            }
          />
        );
      })}
    </div>
  );
};

export default UniverseView;
