import { Module } from '@nestjs/common';
import { FixtureController } from './fixture.controller';
import { FixtureService } from './fixture.service';
import { FixtureRepository } from './repositories/fixture.repository';
import { VendorRepository } from './repositories/vendor.repository';

@Module({
  providers: [VendorRepository, FixtureRepository, FixtureService],
  controllers: [FixtureController],
})
export class FixturesModule {}
