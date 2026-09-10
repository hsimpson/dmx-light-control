import { Module } from '@nestjs/common';
import { FixtureAssetController } from './fixture-asset.controller';
import { FIXTURE_ASSETS_ROOT, resolveAssetsRoot } from './fixture-asset-path';
import { FixtureAssetService } from './fixture-asset.service';
import { FixtureImportExportService } from './fixture-import-export.service';
import { FixtureResolver } from './fixture.resolver';
import { FixtureService } from './fixture.service';
import { FixtureChannelDefinitionRepository } from './repositories/fixture-channel-definition.repository';
import { FixtureChannelModeRepository } from './repositories/fixture-channel-mode.repository';
import { FixtureVendorRepository } from './repositories/fixture-vendor.repository';
import { FixtureRepository } from './repositories/fixture.repository';

@Module({
  controllers: [FixtureAssetController],
  providers: [
    FixtureVendorRepository,
    FixtureRepository,
    FixtureChannelModeRepository,
    FixtureChannelDefinitionRepository,
    {
      provide: FIXTURE_ASSETS_ROOT,
      useFactory: () => resolveAssetsRoot(),
    },
    FixtureAssetService,
    FixtureService,
    FixtureImportExportService,
    FixtureResolver,
  ],
  exports: [FixtureRepository, FixtureChannelModeRepository],
})
export class FixturesModule {}
