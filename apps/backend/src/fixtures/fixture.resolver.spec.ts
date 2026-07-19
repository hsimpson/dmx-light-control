import { plainToInstance } from 'class-transformer';
import { describe, expect, it, vi } from 'vitest';
import { FixtureVendorDto } from './dto/fixture-vendor.dto';
import { FixtureResolver } from './fixture.resolver';
import { FixtureService } from './fixture.service';

function build() {
  const fixtureService = {
    getAllVendors: vi.fn<() => Promise<unknown[]>>(),
    getAllFixtures: vi.fn<() => Promise<unknown[]>>(),
    getFixtureByPublicId: vi.fn<() => Promise<unknown>>(),
    updateFixture: vi.fn<() => Promise<unknown>>(),
    deleteFixtureVendorByPublicId: vi.fn<() => Promise<{ publicId: string; deleted: boolean }>>(),
    createFixtureVendor: vi.fn<() => Promise<unknown>>(),
  };
  const resolver = new FixtureResolver(fixtureService as unknown as FixtureService);
  return { resolver, fixtureService };
}

describe('FixtureResolver', () => {
  it('getAllVendors returns plainToInstance result', async () => {
    const { resolver, fixtureService } = build();
    fixtureService.getAllVendors.mockResolvedValue([{ name: 'v' }]);
    const res = await resolver.getAllVendors();
    expect(res).toEqual(plainToInstance(FixtureVendorDto, [{ name: 'v' }]));
  });

  it('getAllFixtures returns plainToInstance result', async () => {
    const { resolver, fixtureService } = build();
    fixtureService.getAllFixtures.mockResolvedValue([{ name: 'f' }]);
    expect(await resolver.getAllFixtures()).toBeDefined();
  });

  it('getFixtureByExternalId returns null when not found', async () => {
    const { resolver, fixtureService } = build();
    fixtureService.getFixtureByPublicId.mockResolvedValue(undefined);
    expect(await resolver.getFixtureByExternalId('p')).toBeNull();
  });

  it('getFixtureByExternalId returns instance when found', async () => {
    const { resolver, fixtureService } = build();
    fixtureService.getFixtureByPublicId.mockResolvedValue({ name: 'f' });
    expect(await resolver.getFixtureByExternalId('p')).toBeDefined();
  });

  it('updateFixture delegates', async () => {
    const { resolver, fixtureService } = build();
    fixtureService.updateFixture.mockResolvedValue({ name: 'f' });
    expect(await resolver.updateFixture({ publicId: 'p' })).toBeDefined();
  });

  it('deleteFixtureVendorByPublicId delegates', async () => {
    const { resolver, fixtureService } = build();
    fixtureService.deleteFixtureVendorByPublicId.mockResolvedValue({ publicId: 'p', deleted: true });
    expect(await resolver.deleteFixtureVendorByPublicId('p')).toBeDefined();
  });

  it('createFixtureVendor delegates', async () => {
    const { resolver, fixtureService } = build();
    fixtureService.createFixtureVendor.mockResolvedValue({ name: 'v' });
    expect(await resolver.createFixtureVendor({ name: 'v' })).toBeDefined();
  });
});
