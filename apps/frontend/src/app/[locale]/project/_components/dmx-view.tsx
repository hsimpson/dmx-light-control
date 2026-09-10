'use client';

import { Loading } from '@/components/loading';
import { useTranslation } from '@/lib/i18n/use-translation';
import { GetProjectDocument, GetProjectQuery } from '@/shared/types/graphql/graphql';
import { useQuery } from '@apollo/client/react';
import { useMemo } from 'react';
import DmxFixtureBox from './dmx-fixture-box';
import classes from './dmx-view.module.css';
import ProjectTabEmptyState from './project-tab-empty-state';

type ProjectFixture = NonNullable<GetProjectQuery['project']>['projectFixtures'][number];

type DmxViewProperties = {
  projectPublicId: string;
};

function sortProjectFixtures(projectFixtures: ProjectFixture[]): ProjectFixture[] {
  return [...projectFixtures].sort(
    (left, right) => left.startAddress - right.startAddress || left.publicId.localeCompare(right.publicId),
  );
}

const DmxView = ({ projectPublicId }: DmxViewProperties) => {
  const { t } = useTranslation();
  const { data, loading } = useQuery(GetProjectDocument, {
    variables: { publicId: projectPublicId },
    skip: !projectPublicId,
  });

  const projectFixtures = useMemo(
    () => sortProjectFixtures(data?.project?.projectFixtures ?? []),
    [data?.project?.projectFixtures],
  );

  if (loading) {
    return <Loading />;
  }

  if (projectFixtures.length === 0) {
    return (
      <ProjectTabEmptyState message={t({ id: 'ProjectFixtures.empty', defaultMessage: 'No fixtures patched yet' })} />
    );
  }

  return (
    <div className={classes.list} data-testid="dmx-view">
      {projectFixtures.map((fixture, fixtureIndex) => (
        <DmxFixtureBox
          key={fixture.publicId}
          fixture={fixture}
          fixtureNumber={fixtureIndex + 1}
          fixtureVariant={(fixtureIndex % 2) as 0 | 1}
        />
      ))}
    </div>
  );
};

export default DmxView;
