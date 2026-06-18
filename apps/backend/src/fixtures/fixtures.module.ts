import { Module } from '@nestjs/common';
import { FixtureResolver } from './fixture.resolver';
import { FixtureService } from './fixture.service';
import { FixtureVendorRepository } from './repositories/fixture-vendor.repository';
import { FixtureRepository } from './repositories/fixture.repository';

@Module({
  providers: [FixtureVendorRepository, FixtureRepository, FixtureService, FixtureResolver],
})
export class FixturesModule {}
