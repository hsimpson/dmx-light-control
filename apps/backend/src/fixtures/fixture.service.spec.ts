import { describe, expect, it, vi } from 'vitest';
import {
  ChannelDefinitionNotFoundException,
  ChannelModeAlreadyExistsException,
  ChannelModeNotFoundException,
  FixtureNotFoundException,
  FixtureVendorAlreadyExistsException,
  FixtureVendorCreationFailedException,
  FixtureVendorNotFoundException,
} from './fixture.exceptions';
import { FixtureService } from './fixture.service';
import { FixtureChannelModeRepository } from './repositories/fixture-channel-mode.repository';
import { FixtureVendorRepository } from './repositories/fixture-vendor.repository';
import { FixtureRepository } from './repositories/fixture.repository';

function build() {
  const vendorRepo = {
    findMany: vi.fn<() => Promise<unknown[]>>(),
    findOneByPublicId: vi.fn<() => Promise<unknown>>(),
    findOneByName: vi.fn<() => Promise<unknown>>(),
    createOne: vi.fn<() => Promise<unknown>>(),
    deleteOneByPublicId: vi.fn<() => Promise<boolean>>(),
  };
  const fixtureRepo = {
    findMany: vi.fn<() => Promise<unknown[]>>(),
    findOneByPublicId: vi.fn<() => Promise<unknown>>(),
    updateOneByPublicId: vi.fn<() => Promise<unknown>>(),
  };
  const channelModeRepo = {
    replaceAllForFixture: vi.fn<() => Promise<void>>(),
  };
  const service = new FixtureService(
    vendorRepo as unknown as FixtureVendorRepository,
    fixtureRepo as unknown as FixtureRepository,
    channelModeRepo as unknown as FixtureChannelModeRepository,
  );
  return { service, vendorRepo, fixtureRepo, channelModeRepo };
}

const fixtureGraph = {
  id: 1,
  publicId: 'p',
  fixtureChannelDefinitions: [{ id: 10, publicId: 'def-1' }],
  fixtureChannelModes: [{ id: 20, publicId: 'mode-1' }],
};

describe('FixtureService', () => {
  it('getAllVendors delegates to vendor repo', async () => {
    const { service, vendorRepo } = build();
    vendorRepo.findMany.mockResolvedValue(['v']);
    expect(await service.getAllVendors()).toEqual(['v']);
  });

  it('getAllFixtures delegates to fixture repo', async () => {
    const { service, fixtureRepo } = build();
    fixtureRepo.findMany.mockResolvedValue(['f']);
    expect(await service.getAllFixtures()).toEqual(['f']);
  });

  it('getFixtureByPublicId delegates', async () => {
    const { service, fixtureRepo } = build();
    fixtureRepo.findOneByPublicId.mockResolvedValue('f');
    expect(await service.getFixtureByPublicId('p')).toBe('f');
  });

  it('deleteFixtureVendorByPublicId returns publicId and deleted flag', async () => {
    const { service, vendorRepo } = build();
    vendorRepo.deleteOneByPublicId.mockResolvedValue(true);
    expect(await service.deleteFixtureVendorByPublicId('p')).toEqual({ publicId: 'p', deleted: true });
  });

  it('createFixtureVendor delegates', async () => {
    const { service, vendorRepo } = build();
    vendorRepo.createOne.mockResolvedValue('created');
    expect(await service.createFixtureVendor({ name: 'x' })).toBe('created');
  });

  it('updateFixture with name only updates name', async () => {
    const { service, fixtureRepo } = build();
    fixtureRepo.updateOneByPublicId.mockResolvedValue({ id: 1 });
    fixtureRepo.findOneByPublicId.mockResolvedValue('result');
    const res = await service.updateFixture({ publicId: 'p', name: 'new' });
    expect(fixtureRepo.updateOneByPublicId).toHaveBeenCalledWith('p', { name: 'new' });
    expect(res).toBe('result');
  });

  it('updateFixture with vendor.publicId throws when vendor missing', async () => {
    const { service, vendorRepo, fixtureRepo } = build();
    vendorRepo.findOneByPublicId.mockResolvedValue(undefined);
    await expect(service.updateFixture({ publicId: 'p', vendor: { publicId: 'vp' } })).rejects.toBeInstanceOf(
      FixtureVendorNotFoundException,
    );
    expect(fixtureRepo.updateOneByPublicId).not.toHaveBeenCalled();
  });

  it('updateFixture with vendor.publicId sets vendorId when found', async () => {
    const { service, vendorRepo, fixtureRepo } = build();
    vendorRepo.findOneByPublicId.mockResolvedValue({ id: 7 });
    fixtureRepo.updateOneByPublicId.mockResolvedValue({ id: 1 });
    fixtureRepo.findOneByPublicId.mockResolvedValue('r');
    await service.updateFixture({ publicId: 'p', vendor: { publicId: 'vp' } });
    expect(fixtureRepo.updateOneByPublicId).toHaveBeenCalledWith('p', { vendorId: 7 });
  });

  it('updateFixture with vendor.name throws when name already exists', async () => {
    const { service, vendorRepo } = build();
    vendorRepo.findOneByName.mockResolvedValue({ id: 1 });
    await expect(service.updateFixture({ publicId: 'p', vendor: { name: 'dup' } })).rejects.toBeInstanceOf(
      FixtureVendorAlreadyExistsException,
    );
  });

  it('updateFixture with vendor.name throws when creation fails', async () => {
    const { service, vendorRepo } = build();
    vendorRepo.findOneByName.mockResolvedValue(undefined);
    vendorRepo.createOne.mockResolvedValue(undefined);
    await expect(service.updateFixture({ publicId: 'p', vendor: { name: 'new' } })).rejects.toBeInstanceOf(
      FixtureVendorCreationFailedException,
    );
  });

  it('updateFixture with vendor.name creates vendor and updates', async () => {
    const { service, vendorRepo, fixtureRepo } = build();
    vendorRepo.findOneByName.mockResolvedValue(undefined);
    vendorRepo.createOne.mockResolvedValue({ id: 9 });
    fixtureRepo.updateOneByPublicId.mockResolvedValue({ id: 1 });
    fixtureRepo.findOneByPublicId.mockResolvedValue('r');
    await service.updateFixture({ publicId: 'p', vendor: { name: 'new' } });
    expect(fixtureRepo.updateOneByPublicId).toHaveBeenCalledWith('p', { vendorId: 9 });
  });

  it('updateFixture throws FixtureNotFoundException when update yields nothing', async () => {
    const { service, fixtureRepo } = build();
    fixtureRepo.updateOneByPublicId.mockResolvedValue(undefined);
    await expect(service.updateFixture({ publicId: 'p', name: 'x' })).rejects.toBeInstanceOf(FixtureNotFoundException);
  });

  it('updateFixture with no changes still returns the fixture', async () => {
    const { service, fixtureRepo } = build();
    fixtureRepo.findOneByPublicId.mockResolvedValue('r');
    const res = await service.updateFixture({ publicId: 'p' });
    expect(fixtureRepo.updateOneByPublicId).not.toHaveBeenCalled();
    expect(res).toBe('r');
  });

  it('updateFixture with vendor.publicId sets vendorId to undefined when vendor has no id', async () => {
    const { service, vendorRepo, fixtureRepo } = build();
    vendorRepo.findOneByPublicId.mockResolvedValue({});
    fixtureRepo.updateOneByPublicId.mockResolvedValue({ id: 1 });
    fixtureRepo.findOneByPublicId.mockResolvedValue('r');
    await service.updateFixture({ publicId: 'p', vendor: { publicId: 'vp' } });
    expect(fixtureRepo.updateOneByPublicId).toHaveBeenCalledWith('p', { vendorId: undefined });
  });

  it('updateFixture with vendor.name sets vendorId to undefined when new vendor has no id', async () => {
    const { service, vendorRepo, fixtureRepo } = build();
    vendorRepo.findOneByName.mockResolvedValue(undefined);
    vendorRepo.createOne.mockResolvedValue({});
    fixtureRepo.updateOneByPublicId.mockResolvedValue({ id: 1 });
    fixtureRepo.findOneByPublicId.mockResolvedValue('r');
    await service.updateFixture({ publicId: 'p', vendor: { name: 'new' } });
    expect(fixtureRepo.updateOneByPublicId).toHaveBeenCalledWith('p', { vendorId: undefined });
  });

  it('updateFixture omits channelModes and does not replace modes', async () => {
    const { service, fixtureRepo, channelModeRepo } = build();
    fixtureRepo.findOneByPublicId.mockResolvedValue(fixtureGraph);
    await service.updateFixture({ publicId: 'p' });
    expect(channelModeRepo.replaceAllForFixture).not.toHaveBeenCalled();
  });

  it('updateFixture with empty channelModes replaces with an empty list', async () => {
    const { service, fixtureRepo, channelModeRepo } = build();
    fixtureRepo.findOneByPublicId.mockResolvedValue(fixtureGraph);
    await service.updateFixture({ publicId: 'p', channelModes: [] });
    expect(channelModeRepo.replaceAllForFixture).toHaveBeenCalledWith(1, []);
  });

  it('updateFixture with channelModes throws when fixture is missing', async () => {
    const { service, fixtureRepo } = build();
    fixtureRepo.findOneByPublicId.mockResolvedValue(undefined);
    await expect(service.updateFixture({ publicId: 'p', channelModes: [] })).rejects.toBeInstanceOf(
      FixtureNotFoundException,
    );
  });

  it('updateFixture with channelModes throws when a mode publicId is unknown', async () => {
    const { service, fixtureRepo, channelModeRepo } = build();
    fixtureRepo.findOneByPublicId.mockResolvedValue(fixtureGraph);
    await expect(
      service.updateFixture({
        publicId: 'p',
        channelModes: [{ publicId: 'missing-mode', name: 'x', assignments: [] }],
      }),
    ).rejects.toBeInstanceOf(ChannelModeNotFoundException);
    expect(channelModeRepo.replaceAllForFixture).not.toHaveBeenCalled();
  });

  it('updateFixture with channelModes throws when names are duplicated', async () => {
    const { service, fixtureRepo, channelModeRepo } = build();
    fixtureRepo.findOneByPublicId.mockResolvedValue(fixtureGraph);
    await expect(
      service.updateFixture({
        publicId: 'p',
        channelModes: [
          { name: 'dup', assignments: [] },
          { name: 'dup', assignments: [] },
        ],
      }),
    ).rejects.toBeInstanceOf(ChannelModeAlreadyExistsException);
    expect(channelModeRepo.replaceAllForFixture).not.toHaveBeenCalled();
  });

  it('updateFixture with channelModes throws when a definition publicId is unknown', async () => {
    const { service, fixtureRepo, channelModeRepo } = build();
    fixtureRepo.findOneByPublicId.mockResolvedValue(fixtureGraph);
    await expect(
      service.updateFixture({
        publicId: 'p',
        channelModes: [{ name: 'x', assignments: [{ channelDefinitionPublicId: 'missing-def' }] }],
      }),
    ).rejects.toBeInstanceOf(ChannelDefinitionNotFoundException);
    expect(channelModeRepo.replaceAllForFixture).not.toHaveBeenCalled();
  });

  it('updateFixture with channelModes maps definitions and replaces modes', async () => {
    const { service, fixtureRepo, channelModeRepo } = build();
    fixtureRepo.findOneByPublicId.mockResolvedValueOnce(fixtureGraph).mockResolvedValueOnce('reloaded');
    const res = await service.updateFixture({
      publicId: 'p',
      channelModes: [
        { publicId: 'mode-1', name: 'kept', assignments: [{ channelDefinitionPublicId: 'def-1' }] },
        { name: 'new', assignments: [] },
      ],
    });
    expect(channelModeRepo.replaceAllForFixture).toHaveBeenCalledWith(1, [
      { publicId: 'mode-1', name: 'kept', assignments: [{ channelDefinitionId: 10 }] },
      { name: 'new', assignments: [] },
    ]);
    expect(res).toBe('reloaded');
  });

  it('updateFixture with channelModes maps unique violations to ChannelModeAlreadyExistsException', async () => {
    const { service, fixtureRepo, channelModeRepo } = build();
    fixtureRepo.findOneByPublicId.mockResolvedValue(fixtureGraph);
    channelModeRepo.replaceAllForFixture.mockRejectedValue(Object.assign(new Error('unique'), { code: '23505' }));
    await expect(
      service.updateFixture({
        publicId: 'p',
        channelModes: [{ name: 'dup', assignments: [] }],
      }),
    ).rejects.toBeInstanceOf(ChannelModeAlreadyExistsException);
  });
});
