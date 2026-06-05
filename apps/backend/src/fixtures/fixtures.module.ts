import { Module } from '@nestjs/common';
import { FixtureResolver } from './fixture.resolver';
import { FixtureService } from './fixture.service';
import { FixtureRepository } from './repositories/fixture.repository';
import { VendorRepository } from './repositories/vendor.repository';

@Module({
  providers: [VendorRepository, FixtureRepository, FixtureService, FixtureResolver],
})
export class FixturesModule {}
