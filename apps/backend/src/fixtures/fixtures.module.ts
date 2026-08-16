import { Module } from '@nestjs/common';
import { FixtureImportExportService } from './fixture-import-export.service';
import { FixtureResolver } from './fixture.resolver';
import { FixtureService } from './fixture.service';
import { FixtureChannelDefinitionRepository } from './repositories/fixture-channel-definition.repository';
import { FixtureChannelModeRepository } from './repositories/fixture-channel-mode.repository';
import { FixtureVendorRepository } from './repositories/fixture-vendor.repository';
import { FixtureRepository } from './repositories/fixture.repository';

@Module({
  providers: [
    FixtureVendorRepository,
    FixtureRepository,
    FixtureChannelModeRepository,
    FixtureChannelDefinitionRepository,
    FixtureService,
    FixtureImportExportService,
    FixtureResolver,
  ],
})
export class FixturesModule {}
