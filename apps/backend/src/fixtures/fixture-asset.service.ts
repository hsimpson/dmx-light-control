import { FixtureNotFoundException } from '@/fixtures/fixture.exceptions';
import {
  FIXTURE_ASSET_MAX_BYTES,
  FIXTURE_ASSETS_ROOT,
  FixtureAssetKind,
  fixtureAssetAllowedExtensions,
  fixtureAssetAllowedMimeTypes,
  fixtureAssetColumn,
  fixtureAssetFileStem,
  fixtureAssetServedPath,
  isFixtureAssetKind,
  slugifyAssetSegment,
} from '@/fixtures/fixture-asset-path';
import { FixtureRepository } from '@/fixtures/repositories/fixture.repository';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { mkdir, readdir, rename, rm, unlink, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';

export type FixtureAssetIdentity = {
  publicId: string;
  name: string;
  picturePath?: string | null;
  picture2dPath?: string | null;
  model3dPath?: string | null;
  fixtureVendor?: { name: string } | null;
};

export function toFixtureAssetIdentity(
  row:
    | {
        publicId: string | null;
        name: string;
        picturePath?: string | null;
        picture2dPath?: string | null;
        model3dPath?: string | null;
        fixtureVendor?: { name: string } | null;
      }
    | null
    | undefined,
): FixtureAssetIdentity | undefined {
  if (!row?.publicId) {
    return undefined;
  }
  return {
    publicId: row.publicId,
    name: row.name,
    picturePath: row.picturePath,
    picture2dPath: row.picture2dPath,
    model3dPath: row.model3dPath,
    fixtureVendor: row.fixtureVendor,
  };
}

@Injectable()
export class FixtureAssetService {
  public constructor(
    private readonly fixtureRepository: FixtureRepository,
    @Inject(FIXTURE_ASSETS_ROOT) private readonly assetsRoot: string,
  ) {}

  public async upload(
    publicId: string,
    kindValue: string,
    filename: string,
    mimeType: string,
    buffer: Buffer,
  ): Promise<{ kind: FixtureAssetKind; path: string }> {
    const kind = this.requireKind(kindValue);
    this.assertFile(kind, filename, mimeType, buffer);
    const row = await this.requireFixture(publicId);
    const vendorName = row.fixtureVendor?.name ?? 'unnamed';
    const extension = extname(filename).toLowerCase();
    const storedName = `${fixtureAssetFileStem(kind)}${extension}`;
    const directory = this.fixtureDirectory(vendorName, row.name);
    this.assertInsideAssetsRoot(directory);
    await mkdir(directory, { recursive: true });
    await this.removeStemFiles(directory, fixtureAssetFileStem(kind));
    const filePath = join(directory, storedName);
    this.assertInsideAssetsRoot(filePath);
    await writeFile(filePath, buffer);
    const servedPath = fixtureAssetServedPath(vendorName, row.name, storedName);
    await this.fixtureRepository.updateOneByPublicId(publicId, { [fixtureAssetColumn(kind)]: servedPath });
    return { kind, path: servedPath };
  }

  public async remove(publicId: string, kindValue: string): Promise<{ kind: FixtureAssetKind; path: null }> {
    const kind = this.requireKind(kindValue);
    const row = await this.requireFixture(publicId);
    const vendorName = row.fixtureVendor?.name ?? 'unnamed';
    const directory = this.fixtureDirectory(vendorName, row.name);
    await this.removeStemFiles(directory, fixtureAssetFileStem(kind));
    await this.fixtureRepository.updateOneByPublicId(publicId, { [fixtureAssetColumn(kind)]: null });
    return { kind, path: null };
  }

  public async moveIfRenamed(previous: FixtureAssetIdentity, next: FixtureAssetIdentity): Promise<void> {
    const previousVendor = previous.fixtureVendor?.name ?? 'unnamed';
    const nextVendor = next.fixtureVendor?.name ?? 'unnamed';
    const fromDir = this.fixtureDirectory(previousVendor, previous.name);
    const toDir = this.fixtureDirectory(nextVendor, next.name);
    if (fromDir === toDir) {
      return;
    }
    this.assertInsideAssetsRoot(fromDir);
    this.assertInsideAssetsRoot(toDir);
    try {
      await mkdir(dirname(toDir), { recursive: true });
      await rename(fromDir, toDir);
    } catch (error) {
      if (!this.isMissingPath(error)) {
        throw error;
      }
      return;
    }
    const fromPrefix = `/assets/fixtures/${slugifyAssetSegment(previousVendor)}/${slugifyAssetSegment(previous.name)}`;
    const toPrefix = `/assets/fixtures/${slugifyAssetSegment(nextVendor)}/${slugifyAssetSegment(next.name)}`;
    await this.fixtureRepository.updateOneByPublicId(next.publicId, {
      picturePath: this.rewriteServedPath(next.picturePath, fromPrefix, toPrefix),
      picture2dPath: this.rewriteServedPath(next.picture2dPath, fromPrefix, toPrefix),
      model3dPath: this.rewriteServedPath(next.model3dPath, fromPrefix, toPrefix),
    });
    await this.removeEmptyDirectory(dirname(fromDir));
  }

  public async deleteFixtureAssets(row: FixtureAssetIdentity): Promise<void> {
    const vendorName = row.fixtureVendor?.name ?? 'unnamed';
    const directory = this.fixtureDirectory(vendorName, row.name);
    this.assertInsideAssetsRoot(directory);
    await rm(directory, { recursive: true, force: true });
    await this.removeEmptyDirectory(dirname(directory));
  }

  private requireKind(kindValue: string): FixtureAssetKind {
    if (!isFixtureAssetKind(kindValue)) {
      throw new BadRequestException('Unknown fixture asset kind');
    }
    return kindValue;
  }

  private assertFile(kind: FixtureAssetKind, filename: string, mimeType: string, buffer: Buffer): void {
    if (buffer.byteLength === 0 || buffer.byteLength > FIXTURE_ASSET_MAX_BYTES) {
      throw new BadRequestException('Invalid fixture asset size');
    }
    const extension = extname(filename).toLowerCase();
    if (!fixtureAssetAllowedExtensions(kind).includes(extension)) {
      throw new BadRequestException('Unsupported fixture asset file type');
    }
    if (!fixtureAssetAllowedMimeTypes(kind).includes(mimeType)) {
      throw new BadRequestException('Unsupported fixture asset file type');
    }
  }

  private async requireFixture(publicId: string): Promise<FixtureAssetIdentity> {
    const row = await this.fixtureRepository.findOneByPublicId(publicId);
    const identity = toFixtureAssetIdentity(row);
    if (!identity) {
      throw new FixtureNotFoundException(publicId);
    }
    return identity;
  }

  private fixtureDirectory(vendorName: string, fixtureName: string): string {
    return join(this.assetsRoot, 'fixtures', slugifyAssetSegment(vendorName), slugifyAssetSegment(fixtureName));
  }

  private assertInsideAssetsRoot(target: string): void {
    const root = resolve(this.assetsRoot);
    const resolved = resolve(target);
    if (resolved !== root && !resolved.startsWith(root + sep)) {
      throw new BadRequestException('Invalid fixture asset path');
    }
  }

  private async removeStemFiles(directory: string, stem: string): Promise<void> {
    let names: string[];
    try {
      names = await readdir(directory);
    } catch (error) {
      if (this.isMissingPath(error)) {
        return;
      }
      throw error;
    }
    for (const name of names) {
      if (name === stem || name.startsWith(`${stem}.`)) {
        await unlink(join(directory, name));
      }
    }
  }

  private rewriteServedPath(path: string | null | undefined, fromPrefix: string, toPrefix: string): string | null {
    if (!path) {
      return null;
    }
    if (path.startsWith(fromPrefix)) {
      return `${toPrefix}${path.slice(fromPrefix.length)}`;
    }
    return path;
  }

  private async removeEmptyDirectory(directory: string): Promise<void> {
    const root = resolve(join(this.assetsRoot, 'fixtures'));
    const resolved = resolve(directory);
    if (resolved === root || !resolved.startsWith(root + sep)) {
      return;
    }
    try {
      await rm(directory, { recursive: false });
    } catch {
      return;
    }
  }

  private isMissingPath(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
  }
}
