/// <reference types="vitest/globals" />
import 'reflect-metadata';
import { FixtureResolver } from './fixture.resolver';
import { FixtureService } from './fixture.service';
import { FixturesModule } from './fixtures.module';
import { FixtureVendorRepository } from './repositories/fixture-vendor.repository';
import { FixtureRepository } from './repositories/fixture.repository';

describe('FixturesModule', () => {
  it('is an NgModule providing its domain providers', () => {
    expect(FixturesModule.name).toBe('FixturesModule');
    const providers = Reflect.getMetadata('providers', FixturesModule) as unknown[];
    const exports = Reflect.getMetadata('exports', FixturesModule) as unknown[] | undefined;
    expect(providers).toBeDefined();
    expect(providers).toContain(FixtureVendorRepository);
    expect(providers).toContain(FixtureRepository);
    expect(providers).toContain(FixtureService);
    expect(providers).toContain(FixtureResolver);
    // FixturesModule does not export anything (no exports key set on @Module)
    expect(exports).toBeUndefined();
  });
});
