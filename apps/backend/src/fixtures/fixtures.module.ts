import { Module } from '@nestjs/common';
import { FixtureResolver } from './fixture.resolver';
import { FixtureService } from './fixture.service';
import { FixtureChannelAssignmentRepository } from './repositories/fixture-channel-assignment.repository';
import { FixtureChannelDefinitionRepository } from './repositories/fixture-channel-definition.repository';
import { FixtureChannelModeRepository } from './repositories/fixture-channel-mode.repository';
import { FixtureChannelRangeRepository } from './repositories/fixture-channel-range.repository';
import { FixtureRepository } from './repositories/fixture.repository';
import { VendorRepository } from './repositories/vendor.repository';

@Module({
  providers: [
    VendorRepository,
    FixtureRepository,
    FixtureChannelAssignmentRepository,
    FixtureChannelDefinitionRepository,
    FixtureChannelModeRepository,
    FixtureChannelRangeRepository,
    FixtureService,
    FixtureResolver,
  ],
})
export class FixturesModule {}
