'use client';

import { GetProjectQuery } from '@/shared/types/graphql/graphql';
import DmxChannelCell from './dmx-channel-cell';
import classes from './dmx-fixture-box.module.css';

type ProjectFixture = NonNullable<GetProjectQuery['project']>['projectFixtures'][number];

type DmxFixtureBoxProperties = {
  fixture: ProjectFixture;
  fixtureNumber: number;
  fixtureVariant: 0 | 1;
};

function vendorFixtureLabel(fixture: ProjectFixture): string {
  return `${fixture.fixture.fixtureVendor.name} – ${fixture.fixture.name}`;
}

const DmxFixtureBox = ({ fixture, fixtureNumber, fixtureVariant }: DmxFixtureBoxProperties) => {
  const assignments = [...fixture.channelMode.fixtureChannelAssignments].sort(
    (left, right) => left.channelNumber - right.channelNumber,
  );
  const tooltipBase = vendorFixtureLabel(fixture);

  return (
    <div className={classes.box} data-testid={`dmx-fixture-${fixture.publicId}`} data-fixture-variant={fixtureVariant}>
      <div className={classes.label} data-testid={`dmx-fixture-label-${fixtureNumber}`}>
        {fixture.fixture.name} [{fixtureNumber}]
      </div>
      <div className={classes.channels}>
        {assignments.map(assignment => {
          const absoluteChannelNumber = fixture.startAddress + assignment.channelNumber - 1;

          return (
            <div key={assignment.channelNumber} className={classes.channelSlot}>
              <DmxChannelCell
                absoluteChannelNumber={absoluteChannelNumber}
                preset={assignment.fixtureChannelDefinition.preset}
                tooltipLabel={`${absoluteChannelNumber}: ${tooltipBase}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DmxFixtureBox;
