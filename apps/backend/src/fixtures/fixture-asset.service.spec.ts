import { FixtureAssetService } from '@/fixtures/fixture-asset.service';
import { FixtureNotFoundException } from '@/fixtures/fixture.exceptions';
import { FixtureRepository } from '@/fixtures/repositories/fixture.repository';
import { BadRequestException } from '@nestjs/common';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('FixtureAssetService', () => {
  let assetsRoot: string;
  let fixtureRepo: {
    findOneByPublicId: ReturnType<typeof vi.fn>;
    updateOneByPublicId: ReturnType<typeof vi.fn>;
  };
  let service: FixtureAssetService;

  const fixtureRow = {
    publicId: 'fix-1',
    name: 'Spot 250',
    picturePath: null,
    picture2dPath: null,
    model3dPath: null,
    fixtureVendor: { name: 'Acme' },
  };

  beforeEach(async () => {
    assetsRoot = await mkdtemp(join(tmpdir(), 'fixture-assets-'));
    fixtureRepo = {
      findOneByPublicId: vi.fn().mockResolvedValue(fixtureRow),
      updateOneByPublicId: vi.fn().mockResolvedValue(fixtureRow),
    };
    service = new FixtureAssetService(fixtureRepo as unknown as FixtureRepository, assetsRoot);
  });

  afterEach(async () => {
    await rm(assetsRoot, { recursive: true, force: true });
  });

  it('writes an allowlisted picture and stores the served path', async () => {
    const result = await service.upload(
      'fix-1',
      'picture',
      'photo.png',
      'image/png',
      Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    );
    expect(result.path).toBe('/assets/fixtures/acme/spot-250/picture.png');
    const written = await readFile(join(assetsRoot, 'fixtures/acme/spot-250/picture.png'));
    expect(written.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    expect(fixtureRepo.updateOneByPublicId).toHaveBeenCalledWith('fix-1', {
      picturePath: '/assets/fixtures/acme/spot-250/picture.png',
    });
  });

  it('rejects unknown kinds and missing fixtures', async () => {
    await expect(service.upload('fix-1', 'logo', 'a.png', 'image/png', Buffer.from([1]))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    fixtureRepo.findOneByPublicId.mockResolvedValue(undefined);
    await expect(service.upload('missing', 'picture', 'a.png', 'image/png', Buffer.from([1]))).rejects.toBeInstanceOf(
      FixtureNotFoundException,
    );
  });

  it('moves the fixture directory when vendor or name changes', async () => {
    const directory = join(assetsRoot, 'fixtures/acme/spot-250');
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, 'picture.png'), Buffer.from([1]));
    await service.moveIfRenamed(fixtureRow, {
      ...fixtureRow,
      name: 'Spot 500',
      picturePath: '/assets/fixtures/acme/spot-250/picture.png',
    });
    const moved = await readFile(join(assetsRoot, 'fixtures/acme/spot-500/picture.png'));
    expect(moved).toEqual(Buffer.from([1]));
    expect(fixtureRepo.updateOneByPublicId).toHaveBeenCalledWith('fix-1', {
      picturePath: '/assets/fixtures/acme/spot-500/picture.png',
      picture2dPath: null,
      model3dPath: null,
    });
  });
});
