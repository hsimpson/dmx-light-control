import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { FixtureAssetController } from './fixture-asset.controller';
import { FixtureNotFoundException } from './fixture.exceptions';

describe('FixtureAssetController', () => {
  it('rejects an upload that has no file', async () => {
    const controller = new FixtureAssetController({ upload: vi.fn(), remove: vi.fn() } as never);
    await expect(
      controller.upload('fix-1', 'picture', {
        file: async () => {
          await Promise.resolve();
          return undefined;
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps a missing fixture on upload to not found and rethrows other errors', async () => {
    const upload = vi
      .fn()
      .mockRejectedValueOnce(new FixtureNotFoundException('fix-1'))
      .mockRejectedValueOnce(new Error('disk full'));
    const controller = new FixtureAssetController({ upload, remove: vi.fn() } as never);
    const request = {
      file: async () => {
        await Promise.resolve();
        return {
          filename: 'picture.webp',
          mimetype: 'image/webp',
          toBuffer: async () => {
            await Promise.resolve();
            return Buffer.from('img');
          },
        };
      },
    };

    await expect(controller.upload('fix-1', 'picture', request)).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.upload('fix-1', 'picture', request)).rejects.toThrow('disk full');
  });

  it('maps a missing fixture on delete to not found and rethrows other errors', async () => {
    const remove = vi
      .fn()
      .mockRejectedValueOnce(new FixtureNotFoundException('fix-1'))
      .mockRejectedValueOnce(new Error('disk full'));
    const controller = new FixtureAssetController({ upload: vi.fn(), remove } as never);

    await expect(controller.remove('fix-1', 'picture')).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.remove('fix-1', 'picture')).rejects.toThrow('disk full');
  });
});
