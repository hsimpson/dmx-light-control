import { describe, it, expect, vi } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { FixtureResolver } from './fixture.resolver';
import { FixtureService } from './fixture.service';

function build() {
  const fixtureService = {
    getAllVendors: vi.fn(),
    getAllFixtures: vi.fn(),
    getFixtureByPublicId: vi.fn(),
    updateFixture: vi.fn(),
    deleteFixtureVendorByPublicId: vi.fn(),
    createFixtureVendor: vi.fn(),
  } as unknown as FixtureService;
  const resolver = new FixtureResolver(fixtureService);
  return { resolver, fixtureService };
}

describe('FixtureResolver', () => {
  it('getAllVendors returns plainToInstance result', async () => {
    const { resolver, fixtureService } = build();
    (fixtureService.getAllVendors as any).mockResolvedValue([{ name: 'v' }]);
    const res = await resolver.getAllVendors();
    expect(res).toEqual(plainToInstance(Object as any, [{ name: 'v' }]));
  });

  it('getAllFixtures returns plainToInstance result', async () => {
    const { resolver, fixtureService } = build();
    (fixtureService.getAllFixtures as any).mockResolvedValue([{ name: 'f' }]);
    expect(await resolver.getAllFixtures()).toBeDefined();
  });

  it('getFixtureByExternalId returns null when not found', async () => {
    const { resolver, fixtureService } = build();
    (fixtureService.getFixtureByPublicId as any).mockResolvedValue(undefined);
    expect(await resolver.getFixtureByExternalId('p')).toBeNull();
  });

  it('getFixtureByExternalId returns instance when found', async () => {
    const { resolver, fixtureService } = build();
    (fixtureService.getFixtureByPublicId as any).mockResolvedValue({ name: 'f' });
    expect(await resolver.getFixtureByExternalId('p')).toBeDefined();
  });

  it('updateFixture delegates', async () => {
    const { resolver, fixtureService } = build();
    (fixtureService.updateFixture as any).mockResolvedValue({ name: 'f' });
    expect(await resolver.updateFixture({ publicId: 'p' } as any)).toBeDefined();
  });

  it('deleteFixtureVendorByPublicId delegates', async () => {
    const { resolver, fixtureService } = build();
    (fixtureService.deleteFixtureVendorByPublicId as any).mockResolvedValue({ publicId: 'p', deleted: true });
    expect(await resolver.deleteFixtureVendorByPublicId('p')).toBeDefined();
  });

  it('createFixtureVendor delegates', async () => {
    const { resolver, fixtureService } = build();
    (fixtureService.createFixtureVendor as any).mockResolvedValue({ name: 'v' });
    expect(await resolver.createFixtureVendor({ name: 'v' } as any)).toBeDefined();
  });
});
