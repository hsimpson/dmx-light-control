import { describe, it, expect, vi } from 'vitest';
import {
  FixtureNotFoundException,
  FixtureVendorAlreadyExistsException,
  FixtureVendorCreationFailedException,
  FixtureVendorNotFoundException,
} from './fixture.exceptions';
import { FixtureService } from './fixture.service';
import { FixtureVendorRepository } from './repositories/fixture-vendor.repository';
import { FixtureRepository } from './repositories/fixture.repository';

function build() {
  const vendorRepo = {
    findMany: vi.fn(),
    findOneByPublicId: vi.fn(),
    findOneByName: vi.fn(),
    createOne: vi.fn(),
    deleteOneByPublicId: vi.fn(),
  } as unknown as FixtureVendorRepository;
  const fixtureRepo = {
    findMany: vi.fn(),
    findOneByPublicId: vi.fn(),
    updateOneByPublicId: vi.fn(),
  } as unknown as FixtureRepository;
  const service = new FixtureService(vendorRepo, fixtureRepo);
  return { service, vendorRepo, fixtureRepo };
}

describe('FixtureService', () => {
  it('getAllVendors delegates to vendor repo', async () => {
    const { service, vendorRepo } = build();
    (vendorRepo.findMany as any).mockResolvedValue(['v']);
    expect(await service.getAllVendors()).toEqual(['v']);
  });

  it('getAllFixtures delegates to fixture repo', async () => {
    const { service, fixtureRepo } = build();
    (fixtureRepo.findMany as any).mockResolvedValue(['f']);
    expect(await service.getAllFixtures()).toEqual(['f']);
  });

  it('getFixtureByPublicId delegates', async () => {
    const { service, fixtureRepo } = build();
    (fixtureRepo.findOneByPublicId as any).mockResolvedValue('f');
    expect(await service.getFixtureByPublicId('p')).toBe('f');
  });

  it('deleteFixtureVendorByPublicId returns publicId and deleted flag', async () => {
    const { service, vendorRepo } = build();
    (vendorRepo.deleteOneByPublicId as any).mockResolvedValue(true);
    expect(await service.deleteFixtureVendorByPublicId('p')).toEqual({ publicId: 'p', deleted: true });
  });

  it('createFixtureVendor delegates', async () => {
    const { service, vendorRepo } = build();
    (vendorRepo.createOne as any).mockResolvedValue('created');
    expect(await service.createFixtureVendor({ name: 'x' } as any)).toBe('created');
  });

  it('updateFixture with name only updates name', async () => {
    const { service, fixtureRepo } = build();
    (fixtureRepo.updateOneByPublicId as any).mockResolvedValue({ id: 1 });
    (fixtureRepo.findOneByPublicId as any).mockResolvedValue('result');
    const res = await service.updateFixture({ publicId: 'p', name: 'new' } as any);
    expect(fixtureRepo.updateOneByPublicId).toHaveBeenCalledWith('p', { name: 'new' });
    expect(res).toBe('result');
  });

  it('updateFixture with vendor.publicId throws when vendor missing', async () => {
    const { service, vendorRepo, fixtureRepo } = build();
    (vendorRepo.findOneByPublicId as any).mockResolvedValue(undefined);
    await expect(service.updateFixture({ publicId: 'p', vendor: { publicId: 'vp' } } as any)).rejects.toBeInstanceOf(
      FixtureVendorNotFoundException,
    );
    expect(fixtureRepo.updateOneByPublicId).not.toHaveBeenCalled();
  });

  it('updateFixture with vendor.publicId sets vendorId when found', async () => {
    const { service, vendorRepo, fixtureRepo } = build();
    (vendorRepo.findOneByPublicId as any).mockResolvedValue({ id: 7 });
    (fixtureRepo.updateOneByPublicId as any).mockResolvedValue({ id: 1 });
    (fixtureRepo.findOneByPublicId as any).mockResolvedValue('r');
    await service.updateFixture({ publicId: 'p', vendor: { publicId: 'vp' } } as any);
    expect(fixtureRepo.updateOneByPublicId).toHaveBeenCalledWith('p', { vendorId: 7 });
  });

  it('updateFixture with vendor.name throws when name already exists', async () => {
    const { service, vendorRepo } = build();
    (vendorRepo.findOneByName as any).mockResolvedValue({ id: 1 });
    await expect(service.updateFixture({ publicId: 'p', vendor: { name: 'dup' } } as any)).rejects.toBeInstanceOf(
      FixtureVendorAlreadyExistsException,
    );
  });

  it('updateFixture with vendor.name throws when creation fails', async () => {
    const { service, vendorRepo } = build();
    (vendorRepo.findOneByName as any).mockResolvedValue(undefined);
    (vendorRepo.createOne as any).mockResolvedValue(undefined);
    await expect(service.updateFixture({ publicId: 'p', vendor: { name: 'new' } } as any)).rejects.toBeInstanceOf(
      FixtureVendorCreationFailedException,
    );
  });

  it('updateFixture with vendor.name creates vendor and updates', async () => {
    const { service, vendorRepo, fixtureRepo } = build();
    (vendorRepo.findOneByName as any).mockResolvedValue(undefined);
    (vendorRepo.createOne as any).mockResolvedValue({ id: 9 });
    (fixtureRepo.updateOneByPublicId as any).mockResolvedValue({ id: 1 });
    (fixtureRepo.findOneByPublicId as any).mockResolvedValue('r');
    await service.updateFixture({ publicId: 'p', vendor: { name: 'new' } } as any);
    expect(fixtureRepo.updateOneByPublicId).toHaveBeenCalledWith('p', { vendorId: 9 });
  });

  it('updateFixture throws FixtureNotFoundException when update yields nothing', async () => {
    const { service, fixtureRepo } = build();
    (fixtureRepo.updateOneByPublicId as any).mockResolvedValue(undefined);
    await expect(service.updateFixture({ publicId: 'p', name: 'x' } as any)).rejects.toBeInstanceOf(
      FixtureNotFoundException,
    );
  });

  it('updateFixture with no changes still returns the fixture', async () => {
    const { service, fixtureRepo } = build();
    (fixtureRepo.findOneByPublicId as any).mockResolvedValue('r');
    const res = await service.updateFixture({ publicId: 'p' } as any);
    expect(fixtureRepo.updateOneByPublicId).not.toHaveBeenCalled();
    expect(res).toBe('r');
  });

  it('updateFixture with vendor.publicId sets vendorId to undefined when vendor has no id', async () => {
    const { service, vendorRepo, fixtureRepo } = build();
    (vendorRepo.findOneByPublicId as any).mockResolvedValue({});
    (fixtureRepo.updateOneByPublicId as any).mockResolvedValue({ id: 1 });
    (fixtureRepo.findOneByPublicId as any).mockResolvedValue('r');
    await service.updateFixture({ publicId: 'p', vendor: { publicId: 'vp' } } as any);
    expect(fixtureRepo.updateOneByPublicId).toHaveBeenCalledWith('p', { vendorId: undefined });
  });

  it('updateFixture with vendor.name sets vendorId to undefined when new vendor has no id', async () => {
    const { service, vendorRepo, fixtureRepo } = build();
    (vendorRepo.findOneByName as any).mockResolvedValue(undefined);
    (vendorRepo.createOne as any).mockResolvedValue({});
    (fixtureRepo.updateOneByPublicId as any).mockResolvedValue({ id: 1 });
    (fixtureRepo.findOneByPublicId as any).mockResolvedValue('r');
    await service.updateFixture({ publicId: 'p', vendor: { name: 'new' } } as any);
    expect(fixtureRepo.updateOneByPublicId).toHaveBeenCalledWith('p', { vendorId: undefined });
  });
});
