import { Module } from '@nestjs/common';
import { FixtureResolver } from './fixture.resolver';
import { FixtureService } from './fixture.service';
import { FixtureChannelModeRepository } from './repositories/fixture-channel-mode.repository';
import { FixtureVendorRepository } from './repositories/fixture-vendor.repository';
import { FixtureRepository } from './repositories/fixture.repository';

@Module({
  providers: [
    FixtureVendorRepository,
    FixtureRepository,
    FixtureChannelModeRepository,
    FixtureService,
    FixtureResolver,
  ],
})
export class FixturesModule {}
