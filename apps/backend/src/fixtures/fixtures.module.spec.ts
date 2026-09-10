import { describe, it, expect } from 'vitest';
import 'reflect-metadata';
import { FixtureAssetController } from './fixture-asset.controller';
import { FixtureAssetService } from './fixture-asset.service';
import { FixtureImportExportService } from './fixture-import-export.service';
import { FixtureResolver } from './fixture.resolver';
import { FixtureService } from './fixture.service';
import { FixturesModule } from './fixtures.module';
import { FixtureChannelDefinitionRepository } from './repositories/fixture-channel-definition.repository';
import { FixtureVendorRepository } from './repositories/fixture-vendor.repository';
import { FixtureChannelModeRepository } from './repositories/fixture-channel-mode.repository';
import { FixtureRepository } from './repositories/fixture.repository';

describe('FixturesModule', () => {
  it('is an NgModule providing its domain providers', () => {
    expect(FixturesModule.name).toBe('FixturesModule');
    const providers = Reflect.getMetadata('providers', FixturesModule) as unknown[];
    const exports = Reflect.getMetadata('exports', FixturesModule) as unknown[] | undefined;
    expect(providers).toBeDefined();
    expect(providers).toContain(FixtureVendorRepository);
    expect(providers).toContain(FixtureRepository);
    expect(providers).toContain(FixtureChannelDefinitionRepository);
    expect(providers).toContain(FixtureService);
    expect(providers).toContain(FixtureImportExportService);
    expect(providers).toContain(FixtureAssetService);
    expect(providers).toContain(FixtureResolver);
    expect(Reflect.getMetadata('controllers', FixturesModule)).toContain(FixtureAssetController);
    expect(exports).toEqual([FixtureRepository, FixtureChannelModeRepository]);
  });
});
